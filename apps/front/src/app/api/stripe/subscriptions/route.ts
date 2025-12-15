import { NextRequest, NextResponse } from "next/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// GET /api/stripe/subscriptions - List all subscriptions
export async function GET(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "100");

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const params: any = { limit, expand: ["data.customer", "data.items.data.price.product"] };
    if (status !== "all") {
      params.status = status;
    }

    const subscriptions = await stripe.subscriptions.list(params);

    // Get summary stats
    const allSubs = await stripe.subscriptions.list({ limit: 100 });
    const stats = {
      total: allSubs.data.length,
      active: allSubs.data.filter((s) => s.status === "active").length,
      trialing: allSubs.data.filter((s) => s.status === "trialing").length,
      pastDue: allSubs.data.filter((s) => s.status === "past_due").length,
      canceled: allSubs.data.filter((s) => s.status === "canceled").length,
      mrr: allSubs.data
        .filter((s) => s.status === "active")
        .reduce((sum, s) => {
          const item = s.items.data[0];
          if (item?.price?.recurring?.interval === "year") {
            return sum + (item.price.unit_amount || 0) / 12;
          }
          return sum + (item?.price?.unit_amount || 0);
        }, 0),
    };

    const formattedSubs = subscriptions.data.map((sub) => {
      const customer = sub.customer as any;
      const item = sub.items.data[0];
      const product = item?.price?.product as any;

      return {
        id: sub.id,
        status: sub.status,
        customer: {
          id: customer?.id,
          email: customer?.email,
          name: customer?.name,
        },
        plan: {
          name: product?.name || "Unknown",
          priceId: item?.price?.id,
          amount: item?.price?.unit_amount,
          interval: item?.price?.recurring?.interval,
        },
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        created: new Date(sub.created * 1000).toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      subscriptions: formattedSubs,
      stats: {
        ...stats,
        mrr: `$${(stats.mrr / 100).toFixed(2)}`,
      },
    });
  } catch (error: any) {
    console.error("[Stripe Subscriptions] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// POST /api/stripe/subscriptions - Create a checkout session
export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { priceId, customerId, customerEmail, successUrl, cancelUrl, metadata } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Create checkout session
    const sessionParams: any = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/pricing`,
      metadata,
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("[Stripe Subscriptions] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// PATCH /api/stripe/subscriptions - Cancel or update a subscription
export async function PATCH(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { subscriptionId, action, newPriceId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    if (action === "cancel") {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      return NextResponse.json({
        success: true,
        message: "Subscription will cancel at end of billing period",
        subscription: {
          id: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        },
      });
    }

    if (action === "cancel-immediately") {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);

      return NextResponse.json({
        success: true,
        message: "Subscription canceled immediately",
        subscription: {
          id: subscription.id,
          status: subscription.status,
        },
      });
    }

    if (action === "reactivate") {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      return NextResponse.json({
        success: true,
        message: "Subscription reactivated",
        subscription: {
          id: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
    }

    if (action === "change-plan" && newPriceId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
      });

      return NextResponse.json({
        success: true,
        message: "Subscription plan updated",
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Stripe Subscriptions] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subscription" },
      { status: 500 }
    );
  }
}
