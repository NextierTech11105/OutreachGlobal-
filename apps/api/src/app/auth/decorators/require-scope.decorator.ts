import { SetMetadata, applyDecorators, UseGuards } from "@nestjs/common";
import { Scope } from "@/database/schema/api-keys.schema";
import { REQUIRED_SCOPES_KEY, ScopeGuard } from "../guards/scope.guard";

/**
 * RequireScope Decorator
 *
 * Enforces scope-based authorization for API key authenticated requests.
 * Can require a single scope or multiple scopes (all must be present).
 *
 * IMPORTANT: Execution scopes (messages:send, calls:initiate) also require:
 *   - Tenant state to be LIVE or READY_FOR_EXECUTION
 *   - DEV_KEY is blocked from execution scopes regardless of state
 *
 * @example
 * // Single scope
 * @RequireScope(Scope.DATA_READ)
 * async getLeads() { }
 *
 * @example
 * // Multiple scopes (ALL required)
 * @RequireScope(Scope.DATA_READ, Scope.DATA_WRITE)
 * async updateLead() { }
 *
 * @example
 * // Execution scope (requires LIVE tenant state)
 * @RequireScope(Scope.MESSAGES_SEND)
 * async sendMessage() { }
 */
export function RequireScope(...scopes: Scope[]) {
  return applyDecorators(
    SetMetadata(REQUIRED_SCOPES_KEY, scopes),
    UseGuards(ScopeGuard),
  );
}

/**
 * Pre-defined scope combinations for common operations
 */
export const ScopePresets = {
  // Read-only access to data
  DATA_VIEWER: [Scope.DATA_READ],

  // Full data access (read + write)
  DATA_EDITOR: [Scope.DATA_READ, Scope.DATA_WRITE],

  // Enrichment operations
  ENRICHMENT: [Scope.DATA_READ, Scope.ENRICHMENT_EXECUTE],

  // Campaign management (no execution)
  CAMPAIGN_MANAGER: [Scope.CAMPAIGNS_READ, Scope.CAMPAIGNS_CREATE],

  // Full campaign access including execution
  CAMPAIGN_EXECUTOR: [Scope.CAMPAIGNS_READ, Scope.CAMPAIGNS_CREATE, Scope.CAMPAIGNS_EXECUTE],

  // Messaging (requires LIVE state)
  MESSAGING: [Scope.MESSAGES_READ, Scope.MESSAGES_SEND],

  // Calling (requires LIVE state)
  CALLING: [Scope.CALLS_READ, Scope.CALLS_INITIATE],

  // Analytics viewer
  ANALYTICS: [Scope.ANALYTICS_READ],

  // Full analytics access
  ANALYTICS_ADMIN: [Scope.ANALYTICS_READ, Scope.ANALYTICS_EXPORT],
} as const;
