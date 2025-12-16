/**
 * Credit Guard
 * Protects endpoints that consume credits by checking balance before execution
 *
 * Usage:
 * @UseGuards(CreditGuard)
 * @RequireCredits('enrichment', 1)
 * async enrichContact() { ... }
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CreditService, CreditType } from "../services/credit.service";
import { GqlExecutionContext } from "@nestjs/graphql";

// Decorator metadata key
export const REQUIRE_CREDITS_KEY = "requireCredits";

// Decorator to specify credit requirements
export interface CreditRequirement {
  type: CreditType;
  amount: number;
  // If true, check happens but doesn't block - just logs warning
  softCheck?: boolean;
}

/**
 * Decorator to specify credit requirements for an endpoint
 * @param type The type of credit required
 * @param amount The amount of credits required
 * @param softCheck If true, only logs warning instead of blocking
 */
export const RequireCredits = (
  type: CreditType,
  amount: number,
  softCheck = false,
) => SetMetadata(REQUIRE_CREDITS_KEY, { type, amount, softCheck });

@Injectable()
export class CreditGuard implements CanActivate {
  private readonly logger = new Logger(CreditGuard.name);

  constructor(
    private creditService: CreditService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get credit requirement from decorator
    const requirement = this.reflector.get<CreditRequirement>(
      REQUIRE_CREDITS_KEY,
      context.getHandler(),
    );

    // If no credit requirement specified, allow through
    if (!requirement) {
      return true;
    }

    // Get team ID from request context
    const teamId = this.getTeamId(context);
    if (!teamId) {
      this.logger.warn("CreditGuard: No team ID found in context");
      throw new ForbiddenException("Team context required for this operation");
    }

    // Check if team is using BYOK (Bring Your Own Keys)
    const isByok = await this.creditService.isUsingByok(teamId);
    if (isByok) {
      this.logger.debug(`Team ${teamId} using BYOK, skipping credit check`);
      return true;
    }

    // Check credit balance
    const balance = await this.creditService.getBalance(teamId, requirement.type);
    const hasEnough = balance >= requirement.amount;

    if (!hasEnough) {
      if (requirement.softCheck) {
        this.logger.warn(
          `Team ${teamId} has insufficient ${requirement.type} credits ` +
            `(${balance}/${requirement.amount}) - soft check, allowing through`,
        );
        return true;
      }

      this.logger.warn(
        `Team ${teamId} blocked: insufficient ${requirement.type} credits ` +
          `(${balance}/${requirement.amount})`,
      );

      throw new ForbiddenException({
        code: "INSUFFICIENT_CREDITS",
        message: `Insufficient ${requirement.type} credits. Required: ${requirement.amount}, Available: ${balance}`,
        creditType: requirement.type,
        required: requirement.amount,
        available: balance,
        upgrade_url: "/settings/billing",
      });
    }

    this.logger.debug(
      `Team ${teamId} credit check passed: ${requirement.type} ${balance}/${requirement.amount}`,
    );

    return true;
  }

  /**
   * Extract team ID from execution context
   */
  private getTeamId(context: ExecutionContext): string | undefined {
    // Try HTTP context first
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();

    if (request?.user?.teamId) {
      return request.user.teamId;
    }

    if (request?.teamId) {
      return request.teamId;
    }

    // Try GraphQL context
    try {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext();

      if (ctx?.req?.user?.teamId) {
        return ctx.req.user.teamId;
      }

      if (ctx?.teamId) {
        return ctx.teamId;
      }
    } catch {
      // Not a GraphQL context, that's fine
    }

    return undefined;
  }
}

/**
 * Helper to manually check credits in service methods
 * For use when @RequireCredits decorator isn't sufficient
 */
export async function checkCreditsManually(
  creditService: CreditService,
  teamId: string,
  creditType: CreditType,
  amount: number,
): Promise<void> {
  const balance = await creditService.getBalance(teamId, creditType);
  if (balance < amount) {
    throw new ForbiddenException({
      code: "INSUFFICIENT_CREDITS",
      message: `Insufficient ${creditType} credits. Required: ${amount}, Available: ${balance}`,
      creditType,
      required: amount,
      available: balance,
    });
  }
}
