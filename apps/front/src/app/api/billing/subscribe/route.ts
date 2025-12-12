import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, plans, usage } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Stripe integration (configure in env)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// GET /api/billing/subscribe - Get user's current subscription
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Get active subscription with plan details
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
      ),
      with: {
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({
        success: true,
        subscription: null,
        message: "No active subscription",
      });
    }

    // Get current period usage
    const currentUsage = await db.query.usage.findFirst({
      where: and(
        eq(usage.subscriptionId, subscription.id),
        eq(usage.periodStart, subscription.currentPeriodStart!),
      ),
    });

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        usage: currentUsage || {
          leadsUsed: 0,
          propertySearchesUsed: 0,
          smsUsed: 0,
          skipTracesUsed: 0,
        },
      },
    });
  } catch (error: any) {
    console.error("[Billing] Error fetching subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}

// POST /api/billing/subscribe - Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, planSlug, billingCycle, paymentMethodId } = body;

    if (!userId || !planSlug) {
      return NextResponse.json(
        { error: "userId and planSlug are required" },
        { status: 400 },
      );
    }

    // Get the plan
    const plan = await db.query.plans.findFirst({
      where: eq(plans.slug, planSlug),
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check for existing subscription
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
      ),
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(
      periodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1),
    );

    // If Stripe is configured, create checkout session
    if (STRIPE_SECRET_KEY && paymentMethodId) {
      // Dynamic import to avoid issues if stripe isn't installed
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(STRIPE_SECRET_KEY);

        const priceId =
          billingCycle === "yearly"
            ? plan.stripePriceIdYearly
            : plan.stripePriceIdMonthly;

        if (priceId) {
          // Create or retrieve customer
          let customerId = existingSubscription?.stripeCustomerId;

          if (!customerId) {
            const customer = await stripe.customers.create({
              metadata: { userId },
            });
            customerId = customer.id;
          }

          // Create subscription in Stripe
          const stripeSubscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            payment_settings: {
              payment_method_types: ["card"],
              save_default_payment_method: "on_subscription",
            },
            expand: ["latest_invoice.payment_intent"],
          });

          // Create subscription record
          const newSubscription = await db
            .insert(subscriptions)
            .values({
              userId,
              planId: plan.id,
              status: "pending",
              billingCycle: billingCycle || "monthly",
              stripeCustomerId: customerId,
              stripeSubscriptionId: stripeSubscription.id,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            })
            .returning();

          // Initialize usage record
          await db.insert(usage).values({
            subscriptionId: newSubscription[0].id,
            periodStart: now,
            periodEnd: periodEnd,
            leadsUsed: 0,
            leadsLimit: plan.maxLeadsPerMonth || 1000,
            propertySearchesUsed: 0,
            propertySearchesLimit: plan.maxPropertySearches || 500,
            smsUsed: 0,
            smsLimit: plan.maxSmsPerMonth || 500,
            skipTracesUsed: 0,
            skipTracesLimit: plan.maxSkipTraces || 50,
          });

          return NextResponse.json({
            success: true,
            subscription: newSubscription[0],
            clientSecret: (stripeSubscription.latest_invoice as any)
              ?.payment_intent?.client_secret,
            requiresPayment: true,
          });
        }
      } catch (stripeError: any) {
        console.error("[Billing] Stripe error:", stripeError);
        // Fall through to create subscription without Stripe
      }
    }

    // Create subscription without Stripe (for development/testing)
    if (existingSubscription) {
      // Update existing subscription
      const updated = await db
        .update(subscriptions)
        .set({
          planId: plan.id,
          billingCycle: billingCycle || "monthly",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existingSubscription.id))
        .returning();

      return NextResponse.json({
        success: true,
        subscription: updated[0],
        message: "Subscription updated",
      });
    }

    // Create new subscription
    const newSubscription = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: plan.id,
        status: "active",
        billingCycle: billingCycle || "monthly",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      .returning();

    // Initialize usage record
    await db.insert(usage).values({
      subscriptionId: newSubscription[0].id,
      periodStart: now,
      periodEnd: periodEnd,
      leadsUsed: 0,
      leadsLimit: plan.maxLeadsPerMonth || 1000,
      propertySearchesUsed: 0,
      propertySearchesLimit: plan.maxPropertySearches || 500,
      smsUsed: 0,
      smsLimit: plan.maxSmsPerMonth || 500,
      skipTracesUsed: 0,
      skipTracesLimit: plan.maxSkipTraces || 50,
    });

    return NextResponse.json({
      success: true,
      subscription: newSubscription[0],
      message: "Subscription created",
    });
  } catch (error: any) {
    console.error("[Billing] Error creating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 },
    );
  }
}

// DELETE /api/billing/subscribe - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const immediate = searchParams.get("immediate") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
      ),
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    // Cancel in Stripe if applicable
    if (STRIPE_SECRET_KEY && subscription.stripeSubscriptionId) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(STRIPE_SECRET_KEY);

        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: !immediate,
        });

        if (immediate) {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        }
      } catch (stripeError: any) {
        console.error("[Billing] Stripe cancellation error:", stripeError);
      }
    }

    // Update subscription status
    const updated = await db
      .update(subscriptions)
      .set({
        status: immediate ? "canceled" : "canceling",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    return NextResponse.json({
      success: true,
      subscription: updated[0],
      message: immediate
        ? "Subscription canceled immediately"
        : "Subscription will cancel at end of billing period",
    });
  } catch (error: any) {
    console.error("[Billing] Error canceling subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
