import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSubscriptionWithFallback } from "@/lib/billing-auth";

/**
 * REACTIVATE SUBSCRIPTION API
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/billing/reactivate - Reactivate a subscription scheduled for cancellation
 * ═══════════════════════════════════════════════════════════════════════════
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface ReactivateRequest {
  subscriptionId?: string;
}

export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const body: ReactivateRequest = await request.json();
    const { subscriptionId } = body;

    // SECURE: Get subscription from authenticated user or verify ownership
    const authResult = await getSubscriptionWithFallback(subscriptionId);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const { subscription } = authResult;
    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No Stripe subscription linked to this account" },
        { status: 400 },
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Remove cancellation - subscription will continue
    const subscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      },
    );

    // Update local database
    try {
      await db
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: false,
          canceledAt: null,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    } catch (dbError) {
      Logger.warn("Billing", "Failed to update local subscription record", {
        dbError,
      });
    }

    Logger.info("Billing", "Subscription reactivated", {
      subscriptionId: stripeSubscriptionId,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  } catch (error: any) {
    Logger.error("Billing", "Failed to reactivate subscription", {
      error: error.message,
    });
    return NextResponse.json(
      { error: error.message || "Failed to reactivate subscription" },
      { status: 500 },
    );
  }
}
