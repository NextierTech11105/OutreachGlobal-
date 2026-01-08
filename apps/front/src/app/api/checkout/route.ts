import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * STRIPE CHECKOUT API
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/checkout - Create checkout session for subscription
 * GET /api/checkout - Get checkout session status
 * ═══════════════════════════════════════════════════════════════════════════
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Plan configuration - matches pricing page
const PLANS: Record<string, { priceMonthly: number; priceYearly: number; name: string }> = {
  starter: { name: "Starter", priceMonthly: 29700, priceYearly: 297000 },
  pro: { name: "Pro", priceMonthly: 59700, priceYearly: 597000 },
  agency: { name: "Agency", priceMonthly: 149700, priceYearly: 1497000 },
  "white-label": { name: "White-Label", priceMonthly: 299700, priceYearly: 2997000 },
};

// POST - Create checkout session
export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { 
        error: "Stripe not configured",
        setup: "Add STRIPE_SECRET_KEY to environment variables"
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { 
      plan = "starter",
      billing = "monthly",
      email,
      teamId,
      successUrl,
      cancelUrl 
    } = body;

    const planConfig = PLANS[plan];
    if (!planConfig) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Valid plans: ${Object.keys(PLANS).join(", ")}` },
        { status: 400 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://monkfish-app-mb7h3.ondigitalocean.app";

    // Create or retrieve customer
    let customerId: string | undefined;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email,
          metadata: { teamId: teamId || "", plan },
        });
        customerId = customer.id;
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : email,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Nextier ${planConfig.name} Plan`,
              description: `${billing === "yearly" ? "Annual" : "Monthly"} subscription`,
            },
            unit_amount: billing === "yearly" ? planConfig.priceYearly / 12 : planConfig.priceMonthly,
            recurring: {
              interval: billing === "yearly" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          plan,
          teamId: teamId || "",
        },
      },
      success_url: successUrl || `${baseUrl}/get-started/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/pricing`,
      metadata: {
        plan,
        billing,
        teamId: teamId || "",
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("[Checkout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// GET - Check session status or redirect to checkout
export async function GET(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const plan = searchParams.get("plan") || "starter";
  const billing = searchParams.get("billing") || "monthly";

  // If session_id provided, get session status
  if (sessionId) {
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "customer"],
      });

      return NextResponse.json({
        success: true,
        status: session.status,
        paymentStatus: session.payment_status,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
  }

  // Otherwise, return plan info
  const planConfig = PLANS[plan];
  if (!planConfig) {
    return NextResponse.json(
      { error: `Invalid plan: ${plan}` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    plan,
    billing,
    name: planConfig.name,
    price: billing === "yearly" ? planConfig.priceYearly : planConfig.priceMonthly,
    priceFormatted: `$${((billing === "yearly" ? planConfig.priceYearly : planConfig.priceMonthly) / 100).toFixed(0)}`,
    interval: billing === "yearly" ? "year" : "month",
    trialDays: 30,
  });
}
