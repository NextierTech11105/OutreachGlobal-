import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { SubscriptionService } from "../services/subscription.service";

/**
 * TRIAL GUARD
 * ═══════════════════════════════════════════════════════════════════════════
 * Protects routes/resolvers from expired trials.
 * Use @RequireActiveSubscription() decorator to protect endpoints.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const REQUIRE_SUBSCRIPTION_KEY = "requireActiveSubscription";
export const RequireActiveSubscription = () =>
  SetMetadata(REQUIRE_SUBSCRIPTION_KEY, true);

export const ALLOW_TRIAL_KEY = "allowTrial";
export const AllowTrial = () => SetMetadata(ALLOW_TRIAL_KEY, true);

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route requires active subscription
    const requireSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If route doesn't require subscription, allow access
    if (!requireSubscription) {
      return true;
    }

    // Check if trial is allowed for this route
    const allowTrial = this.reflector.getAllAndOverride<boolean>(
      ALLOW_TRIAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get team ID from request context
    const teamId = this.getTeamId(context);

    if (!teamId) {
      throw new ForbiddenException("Team context required");
    }

    // Check subscription status
    const trialStatus = await this.subscriptionService.getTrialStatus(teamId);

    // Active subscription always allowed
    if (trialStatus.isActive) {
      return true;
    }

    // Trial allowed and user is trialing (not expired)
    if (allowTrial && trialStatus.isTrialing && !trialStatus.isExpired) {
      return true;
    }

    // If can access features (includes grace period), allow
    if (trialStatus.canAccessFeatures) {
      return true;
    }

    // Trial expired or no subscription
    throw new ForbiddenException({
      code: "SUBSCRIPTION_REQUIRED",
      message: "Your trial has expired. Please upgrade to continue.",
      trialStatus: {
        isExpired: trialStatus.isExpired,
        daysRemaining: trialStatus.daysRemaining,
        needsUpgrade: trialStatus.needsUpgrade,
      },
    });
  }

  private getTeamId(context: ExecutionContext): string | null {
    // Try GraphQL context first
    try {
      const gqlContext = GqlExecutionContext.create(context);
      const req = gqlContext.getContext().req;
      return req?.teamId || req?.user?.teamId || null;
    } catch {
      // Fall back to HTTP context
      const request = context.switchToHttp().getRequest();
      return request?.teamId || request?.user?.teamId || null;
    }
  }
}
