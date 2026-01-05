import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import {
  ApiKeyType,
  Scope,
  hasScope,
  getEffectiveScopes,
  ApiKey,
  Tenant,
  TenantState,
  ExecutionScopes,
} from "@/database/schema/api-keys.schema";

export const REQUIRED_SCOPES_KEY = "requiredScopes";

/**
 * Scope Guard
 *
 * Enforces scope-based authorization for API key authenticated requests.
 * Checks if the API key has the required scope(s) for the resolver.
 *
 * IMPORTANT: Execution scopes (messages:send, calls:initiate) require:
 *   1. The API key must have the scope
 *   2. The tenant must be in LIVE state (post-onboarding)
 *   3. DEV_KEY cannot execute regardless of state
 *
 * Usage:
 *   @RequireScope(Scope.MESSAGES_SEND)
 *   async sendMessage(...) { }
 *
 *   @RequireScope([Scope.DATA_READ, Scope.DATA_WRITE])  // All required
 *   async updateData(...) { }
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Get request from execution context
   */
  private getRequest(context: ExecutionContext): any {
    const type = context.getType<GqlContextType>();
    if (type === "graphql") {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext().req;
    }
    return context.switchToHttp().getRequest();
  }

  /**
   * Check if any of the required scopes are execution scopes
   */
  private hasExecutionScope(requiredScopes: Scope[]): boolean {
    return requiredScopes.some((scope) => ExecutionScopes.includes(scope));
  }

  /**
   * Check if the tenant state allows execution
   */
  private canExecute(tenant: Tenant | undefined, apiKey: ApiKey): { allowed: boolean; reason?: string } {
    // OWNER_KEY can always execute (internal platform access)
    if (apiKey.type === ApiKeyType.OWNER_KEY) {
      return { allowed: true };
    }

    // DEV_KEY can NEVER execute (by design - safe sandbox)
    if (apiKey.type === ApiKeyType.DEV_KEY) {
      return {
        allowed: false,
        reason: "DEV_KEY cannot send messages or initiate calls. " +
          "Dev keys are for integration testing only. " +
          "Use an ADMIN_KEY or SUB_KEY for execution.",
      };
    }

    // No tenant = no execution (except OWNER)
    if (!tenant) {
      return {
        allowed: false,
        reason: "No tenant associated with this API key.",
      };
    }

    // Check tenant state
    switch (tenant.state) {
      case TenantState.LIVE:
        return { allowed: true };

      case TenantState.READY_FOR_EXECUTION:
        return { allowed: true };

      case TenantState.PENDING_ONBOARDING:
        return {
          allowed: false,
          reason: "Execution is disabled until onboarding is complete. " +
            "Book your founder strategy session to enable messaging and calling. " +
            "Contact support@nextier.io for assistance.",
        };

      case TenantState.DEMO:
        // DEMO tenants can execute within their caps
        if (apiKey.type === ApiKeyType.DEMO_KEY) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: "Demo accounts have limited execution. " +
            "Upgrade to enable full messaging and calling capabilities.",
        };

      default:
        return {
          allowed: false,
          reason: `Unknown tenant state: ${tenant.state}`,
        };
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required scopes from decorator
    const requiredScopes = this.reflector.getAllAndOverride<Scope[]>(
      REQUIRED_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no scopes required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = this.getRequest(context);
    const apiKey: ApiKey | undefined = request["apiKey"];
    const tenant: Tenant | undefined = request["tenant"];

    // If using JWT auth (no API key), fall back to role-based auth
    // JWT users are considered OWNER level for backward compatibility
    if (!apiKey) {
      const user = request["user"];
      if (user) {
        // JWT authenticated users have full access (legacy behavior)
        // In production, you may want to restrict this further
        return true;
      }
      throw new ForbiddenException("Authentication required");
    }

    // Check if key has expired
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      throw new ForbiddenException("API key has expired");
    }

    // Check if key is active
    if (!apiKey.isActive) {
      throw new ForbiddenException("API key is inactive");
    }

    // Get effective scopes for this key
    const effectiveScopes = getEffectiveScopes(apiKey);

    // OWNER_KEY has all scopes
    if (apiKey.type === ApiKeyType.OWNER_KEY || effectiveScopes.includes(Scope.ALL)) {
      return true;
    }

    // Check each required scope
    const missingScopes: Scope[] = [];
    for (const required of requiredScopes) {
      if (!effectiveScopes.includes(required)) {
        missingScopes.push(required);
      }
    }

    if (missingScopes.length > 0) {
      throw new ForbiddenException(
        `API key missing required scope(s): ${missingScopes.join(", ")}. ` +
        `Your key type (${apiKey.type}) has scopes: ${effectiveScopes.join(", ") || "none"}`,
      );
    }

    // CRITICAL: Check if this is an execution scope and enforce tenant state
    if (this.hasExecutionScope(requiredScopes)) {
      const executionCheck = this.canExecute(tenant, apiKey);
      if (!executionCheck.allowed) {
        throw new ForbiddenException(executionCheck.reason);
      }
    }

    return true;
  }
}

/**
 * Check usage caps for DEMO_KEY and other limited keys
 */
export function checkUsageCap(
  apiKey: ApiKey,
  action: "message" | "call" | "enrichment",
): { allowed: boolean; message?: string } {
  const caps = apiKey.usageCaps as NonNullable<ApiKey["usageCaps"]>;
  const counters = apiKey.usageCounters as NonNullable<ApiKey["usageCounters"]>;

  if (!caps) return { allowed: true };

  switch (action) {
    case "message":
      // Check total message cap
      if (caps.maxMessagesTotal !== undefined) {
        const used = counters?.messagesUsedTotal || 0;
        if (used >= caps.maxMessagesTotal) {
          return {
            allowed: false,
            message: `Message limit reached (${used}/${caps.maxMessagesTotal}). ` +
              (apiKey.type === ApiKeyType.DEMO_KEY
                ? "Upgrade to continue sending messages."
                : "Contact support to increase your limit."),
          };
        }
      }
      // Check daily message cap
      if (caps.maxMessagesPerDay !== undefined) {
        const used = counters?.messagesUsedToday || 0;
        if (used >= caps.maxMessagesPerDay) {
          return {
            allowed: false,
            message: `Daily message limit reached (${used}/${caps.maxMessagesPerDay}). Resets at midnight UTC.`,
          };
        }
      }
      break;

    case "call":
      if (caps.maxCallsTotal !== undefined) {
        const used = counters?.callsUsedTotal || 0;
        if (used >= caps.maxCallsTotal) {
          return {
            allowed: false,
            message: `Call limit reached (${used}/${caps.maxCallsTotal}). ` +
              (apiKey.type === ApiKeyType.DEMO_KEY
                ? "Upgrade to continue making calls."
                : "Contact support to increase your limit."),
          };
        }
      }
      if (caps.maxCallsPerDay !== undefined) {
        const used = counters?.callsUsedToday || 0;
        if (used >= caps.maxCallsPerDay) {
          return {
            allowed: false,
            message: `Daily call limit reached (${used}/${caps.maxCallsPerDay}). Resets at midnight UTC.`,
          };
        }
      }
      break;

    case "enrichment":
      if (caps.maxEnrichmentsPerDay !== undefined) {
        const used = counters?.enrichmentsUsedToday || 0;
        if (used >= caps.maxEnrichmentsPerDay) {
          return {
            allowed: false,
            message: `Daily enrichment limit reached (${used}/${caps.maxEnrichmentsPerDay}). Resets at midnight UTC.`,
          };
        }
      }
      break;
  }

  return { allowed: true };
}
