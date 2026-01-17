import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { subscriptions, plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { differenceInDays, isAfter } from "date-fns";

/**
 * GET /api/subscription/status
 *
 * Returns the team's subscription and trial status.
 * Used by the frontend to show trial banners and upgrade walls.
 */
export async function GET() {
  try {
    const { userId, teamId } = await apiAuth();

    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({
        error: "Database not configured",
      }, { status: 500 });
    }

    // Get subscription for this team
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.teamId, teamId),
      with: {
        plan: true,
      },
    });

    const now = new Date();

    // No subscription found
    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        isTrialing: false,
        isExpired: true,
        isActive: false,
        daysRemaining: 0,
        trialEnd: null,
        status: "expired",
        canAccessFeatures: false,
        needsUpgrade: true,
        plan: null,
      });
    }

    const status = subscription.status;
    const trialEnd = subscription.trialEndsAt;
    const isTrialing = status === "trialing";
    const isActive = status === "active";

    // Calculate days remaining
    let daysRemaining = 0;
    let isExpired = false;

    if (isTrialing && trialEnd) {
      if (isAfter(now, trialEnd)) {
        isExpired = true;
        daysRemaining = 0;
      } else {
        daysRemaining = differenceInDays(trialEnd, now);
      }
    }

    // Determine feature access
    const canAccessFeatures =
      isActive || (isTrialing && !isExpired) || status === "past_due";

    const needsUpgrade = isExpired || status === "canceled";

    return NextResponse.json({
      hasSubscription: true,
      isTrialing,
      isExpired,
      isActive,
      daysRemaining,
      trialEnd,
      status: isExpired ? "expired" : status,
      canAccessFeatures,
      needsUpgrade,
      plan: subscription.plan
        ? {
            id: subscription.plan.id,
            slug: subscription.plan.slug,
            name: subscription.plan.name,
          }
        : null,
    });
  } catch (error) {
    console.error("[Subscription Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 },
    );
  }
}
