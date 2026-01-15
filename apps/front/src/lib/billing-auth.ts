/**
 * Billing Authentication Helpers
 * ═══════════════════════════════════════════════════════════════════════════
 * Secure helpers to get user subscriptions from authenticated sessions.
 * Prevents unauthorized access to other users' billing data.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from "@/lib/db";
import { subscriptions, plans } from "@/lib/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { requireTenantContext, apiAuth } from "@/lib/api-auth";
import { Logger } from "@/lib/logger";

export interface AuthenticatedSubscription {
  id: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: string;
  planId: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd?: boolean;
}

export interface BillingAuthResult {
  success: true;
  userId: string;
  teamId: string;
  subscription: AuthenticatedSubscription;
}

export interface BillingAuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Get the authenticated user's active subscription.
 * Throws if user is not authenticated or has no subscription.
 *
 * Usage in API routes:
 * ```
 * const auth = await getAuthenticatedSubscription();
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * const { subscription, userId, teamId } = auth;
 * ```
 */
export async function getAuthenticatedSubscription(): Promise<
  BillingAuthResult | BillingAuthError
> {
  try {
    // Require authenticated user with team context
    const ctx = await requireTenantContext();
    const { userId, teamId } = ctx;

    if (!db) {
      Logger.error("Billing", "Database not configured");
      return {
        success: false,
        error: "Service unavailable",
        status: 503,
      };
    }

    // Find subscription for this user/team
    // Check both userId and teamId for flexibility
    const subscriptionResult = await db
      .select({
        id: subscriptions.id,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        status: subscriptions.status,
        planId: subscriptions.planId,
        billingCycle: subscriptions.billingCycle,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        trialEndsAt: subscriptions.trialEndsAt,
        canceledAt: subscriptions.canceledAt,
      })
      .from(subscriptions)
      .where(
        or(
          eq(subscriptions.userId, userId),
          eq(subscriptions.teamId, teamId)
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (subscriptionResult.length === 0) {
      Logger.warn("Billing", "No subscription found for user", {
        userId,
        teamId,
      });
      return {
        success: false,
        error: "No active subscription found",
        status: 404,
      };
    }

    const subscription = subscriptionResult[0];

    Logger.info("Billing", "Authenticated subscription access", {
      userId,
      teamId,
      subscriptionId: subscription.id,
    });

    return {
      success: true,
      userId,
      teamId,
      subscription: {
        ...subscription,
        planId: subscription.planId as string,
      },
    };
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.message?.includes("Unauthorized")) {
      return {
        success: false,
        error: error.message,
        status: 401,
      };
    }

    Logger.error("Billing", "Auth error getting subscription", {
      error: error.message,
    });

    return {
      success: false,
      error: "Authentication failed",
      status: 401,
    };
  }
}

/**
 * Verify that a subscriptionId belongs to the authenticated user.
 * Use this when subscriptionId is passed in request body but needs validation.
 *
 * This allows backward compatibility with existing integrations while adding security.
 */
export async function verifySubscriptionOwnership(
  subscriptionId: string
): Promise<BillingAuthResult | BillingAuthError> {
  try {
    const ctx = await requireTenantContext();
    const { userId, teamId } = ctx;

    if (!db) {
      return {
        success: false,
        error: "Service unavailable",
        status: 503,
      };
    }

    // Find the subscription and verify ownership
    const subscriptionResult = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        teamId: subscriptions.teamId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        status: subscriptions.status,
        planId: subscriptions.planId,
        billingCycle: subscriptions.billingCycle,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        trialEndsAt: subscriptions.trialEndsAt,
        canceledAt: subscriptions.canceledAt,
      })
      .from(subscriptions)
      .where(
        or(
          eq(subscriptions.stripeSubscriptionId, subscriptionId),
          eq(subscriptions.id, subscriptionId)
        )
      )
      .limit(1);

    if (subscriptionResult.length === 0) {
      return {
        success: false,
        error: "Subscription not found",
        status: 404,
      };
    }

    const subscription = subscriptionResult[0];

    // CRITICAL: Verify ownership - subscription must belong to this user/team
    const isOwner =
      subscription.userId === userId ||
      subscription.teamId === teamId;

    if (!isOwner) {
      Logger.warn("Billing", "Unauthorized subscription access attempt", {
        attemptedBy: userId,
        subscriptionOwner: subscription.userId,
        subscriptionTeam: subscription.teamId,
      });

      return {
        success: false,
        error: "You don't have permission to access this subscription",
        status: 403,
      };
    }

    return {
      success: true,
      userId,
      teamId,
      subscription: {
        id: subscription.id,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        status: subscription.status,
        planId: subscription.planId as string,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        canceledAt: subscription.canceledAt,
      },
    };
  } catch (error: any) {
    if (error.message?.includes("Unauthorized")) {
      return {
        success: false,
        error: error.message,
        status: 401,
      };
    }

    Logger.error("Billing", "Error verifying subscription ownership", {
      error: error.message,
    });

    return {
      success: false,
      error: "Authentication failed",
      status: 401,
    };
  }
}

/**
 * Get subscription with fallback for unauthenticated requests.
 * Used for backward compatibility during transition period.
 *
 * Priority:
 * 1. If user is authenticated, get their subscription (secure path)
 * 2. If subscriptionId provided and ALLOW_LEGACY_BILLING=true, use it (legacy path)
 * 3. Otherwise, require authentication
 */
export async function getSubscriptionWithFallback(
  providedSubscriptionId?: string
): Promise<BillingAuthResult | BillingAuthError> {
  // First, try authenticated path
  const auth = await apiAuth();

  if (auth.userId && auth.teamId) {
    // User is authenticated - prefer secure path
    if (providedSubscriptionId) {
      // Verify the provided ID belongs to this user
      return verifySubscriptionOwnership(providedSubscriptionId);
    } else {
      // Get user's subscription automatically
      return getAuthenticatedSubscription();
    }
  }

  // Check if legacy mode is allowed (for backward compatibility during migration)
  const allowLegacy = process.env.ALLOW_LEGACY_BILLING === "true";

  if (allowLegacy && providedSubscriptionId) {
    Logger.warn("Billing", "Using legacy unauthenticated billing access", {
      subscriptionId: providedSubscriptionId,
    });

    // Legacy path - no ownership verification (to be deprecated)
    if (!db) {
      return {
        success: false,
        error: "Service unavailable",
        status: 503,
      };
    }

    const subscriptionResult = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        teamId: subscriptions.teamId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        status: subscriptions.status,
        planId: subscriptions.planId,
        billingCycle: subscriptions.billingCycle,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        trialEndsAt: subscriptions.trialEndsAt,
        canceledAt: subscriptions.canceledAt,
      })
      .from(subscriptions)
      .where(
        or(
          eq(subscriptions.stripeSubscriptionId, providedSubscriptionId),
          eq(subscriptions.id, providedSubscriptionId)
        )
      )
      .limit(1);

    if (subscriptionResult.length === 0) {
      return {
        success: false,
        error: "Subscription not found",
        status: 404,
      };
    }

    const sub = subscriptionResult[0];

    return {
      success: true,
      userId: sub.userId,
      teamId: sub.teamId || sub.userId,
      subscription: {
        id: sub.id,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        stripeCustomerId: sub.stripeCustomerId,
        status: sub.status,
        planId: sub.planId as string,
        billingCycle: sub.billingCycle,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEndsAt: sub.trialEndsAt,
        canceledAt: sub.canceledAt,
      },
    };
  }

  // No auth and no legacy mode - require authentication
  return {
    success: false,
    error: "Authentication required",
    status: 401,
  };
}
