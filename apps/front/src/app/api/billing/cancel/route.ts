import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendCancellationEmail } from "@/lib/email";
import { Logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSubscriptionWithFallback } from "@/lib/billing-auth";

/**
 * CANCEL SUBSCRIPTION API
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/billing/cancel - Cancel subscription at period end
 * ═══════════════════════════════════════════════════════════════════════════
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface CancelRequest {
  subscriptionId?: string;
  reason?: string;
  feedback?: string;
}

export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const body: CancelRequest = await request.json();
    const { subscriptionId, reason, feedback } = body;

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

    // Cancel at period end (not immediately)
    const stripeSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: true,
        metadata: {
          cancellation_reason: reason || "not_specified",
          cancellation_feedback: feedback || "",
          cancelled_at: new Date().toISOString(),
        },
      },
    );

    const periodEndDate = new Date(
      stripeSubscription.current_period_end * 1000,
    );

    // Update local database
    try {
      await db
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    } catch (dbError) {
      Logger.warn("Billing", "Failed to update local subscription record", {
        dbError,
      });
    }

    // Get customer email for notification
    const customer = await stripe.customers.retrieve(
      stripeSubscription.customer as string,
    );

    if (customer && !customer.deleted && customer.email) {
      // Send cancellation confirmation email
      await sendCancellationEmail(
        customer.email,
        customer.name || "Customer",
        periodEndDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      );
    }

    // Log cancellation feedback for analysis
    Logger.info("Billing", "Subscription cancelled", {
      subscriptionId: stripeSubscriptionId,
      reason,
      feedback,
      periodEnd: periodEndDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Subscription will cancel at period end",
      subscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        currentPeriodEnd: periodEndDate.toISOString(),
      },
    });
  } catch (error: any) {
    Logger.error("Billing", "Failed to cancel subscription", {
      error: error.message,
    });
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
