import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * CHANGE PLAN API
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/billing/change-plan - Upgrade or downgrade subscription plan
 * ═══════════════════════════════════════════════════════════════════════════
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Plan price IDs from Stripe - map plan slugs to Stripe price IDs
// These should be created in your Stripe dashboard
const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "price_starter_monthly",
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || "price_starter_yearly",
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly",
  },
  agency: {
    monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || "price_agency_monthly",
    yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || "price_agency_yearly",
  },
  "white-label": {
    monthly: process.env.STRIPE_PRICE_WL_MONTHLY || "price_wl_monthly",
    yearly: process.env.STRIPE_PRICE_WL_YEARLY || "price_wl_yearly",
  },
};

interface ChangePlanRequest {
  subscriptionId?: string;
  planSlug: string;
  billingCycle?: "monthly" | "yearly";
}

export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const body: ChangePlanRequest = await request.json();
    const { subscriptionId, planSlug, billingCycle = "monthly" } = body;

    if (!planSlug) {
      return NextResponse.json(
        { error: "Plan slug is required" },
        { status: 400 },
      );
    }

    // Validate plan exists
    const planPrices = PLAN_PRICES[planSlug];
    if (!planPrices) {
      return NextResponse.json(
        { error: `Invalid plan: ${planSlug}. Valid plans: ${Object.keys(PLAN_PRICES).join(", ")}` },
        { status: 400 },
      );
    }

    // In production, get subscriptionId from authenticated user session
    let stripeSubscriptionId = subscriptionId;

    if (!stripeSubscriptionId) {
      // TODO: Get from authenticated user's team
      return NextResponse.json(
        { error: "Subscription ID required" },
        { status: 400 },
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Get current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    if (!currentSubscription || currentSubscription.status === "canceled") {
      return NextResponse.json(
        { error: "Subscription not found or already cancelled" },
        { status: 400 },
      );
    }

    const newPriceId = planPrices[billingCycle];
    const currentItemId = currentSubscription.items.data[0]?.id;

    if (!currentItemId) {
      return NextResponse.json(
        { error: "No subscription items found" },
        { status: 400 },
      );
    }

    // Update subscription with new price
    // proration_behavior: "create_prorations" will credit/charge the difference
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: currentItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
      metadata: {
        plan: planSlug,
        billing_cycle: billingCycle,
        changed_at: new Date().toISOString(),
      },
    });

    // Update local database
    try {
      await db
        .update(subscriptions)
        .set({
          planId: planSlug,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    } catch (dbError) {
      Logger.warn("Billing", "Failed to update local subscription record", { dbError });
    }

    Logger.info("Billing", "Plan changed", {
      subscriptionId: stripeSubscriptionId,
      newPlan: planSlug,
      billingCycle,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully changed to ${planSlug} plan`,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        plan: planSlug,
        billingCycle,
      },
    });
  } catch (error: any) {
    Logger.error("Billing", "Failed to change plan", { error: error.message });
    return NextResponse.json(
      { error: error.message || "Failed to change plan" },
      { status: 500 },
    );
  }
}
