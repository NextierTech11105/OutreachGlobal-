import { NextRequest, NextResponse } from "next/server";

// POST /api/stripe/test - Test Stripe connection with provided key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secretKey } = body;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Secret key is required" },
        { status: 400 },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secretKey);

    // Test by fetching account info
    const account = await stripe.accounts.retrieve();
    const balance = await stripe.balance.retrieve();
    const products = await stripe.products.list({ limit: 100, active: true });
    const prices = await stripe.prices.list({ limit: 100, active: true });
    const subscriptions = await stripe.subscriptions.list({
      limit: 1,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        businessName:
          account.business_profile?.name ||
          account.settings?.dashboard?.display_name ||
          "Your Business",
        email: account.email,
        country: account.country,
        defaultCurrency: account.default_currency,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
      stats: {
        balance: balance.available?.[0]?.amount
          ? `$${(balance.available[0].amount / 100).toFixed(2)}`
          : "$0.00",
        pendingBalance: balance.pending?.[0]?.amount
          ? `$${(balance.pending[0].amount / 100).toFixed(2)}`
          : "$0.00",
        products: products.data.length,
        prices: prices.data.length,
        activeSubscriptions: subscriptions.data.length > 0,
      },
    });
  } catch (error: any) {
    console.error("[Stripe Test] Error:", error);

    if (error.type === "StripeAuthenticationError") {
      return NextResponse.json(
        { error: "Invalid API key. Please check your Stripe secret key." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to connect to Stripe" },
      { status: 500 },
    );
  }
}

// GET /api/stripe/test - Check if Stripe is configured via env
export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    return NextResponse.json({
      configured: false,
      hasSecretKey: false,
      hasWebhookSecret: false,
      hasPublishableKey: false,
    });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secretKey);
    const account = await stripe.accounts.retrieve();
    const balance = await stripe.balance.retrieve();
    const products = await stripe.products.list({ limit: 100, active: true });
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      status: "active",
    });

    return NextResponse.json({
      configured: true,
      hasSecretKey: true,
      hasWebhookSecret: !!webhookSecret,
      hasPublishableKey: !!publishableKey,
      account: {
        id: account.id,
        businessName: account.business_profile?.name || "Your Business",
        chargesEnabled: account.charges_enabled,
      },
      stats: {
        balance: balance.available?.[0]?.amount
          ? `$${(balance.available[0].amount / 100).toFixed(2)}`
          : "$0.00",
        products: products.data.length,
        activeSubscriptions: subscriptions.data.length,
      },
    });
  } catch {
    return NextResponse.json({
      configured: false,
      hasSecretKey: true,
      hasWebhookSecret: !!webhookSecret,
      hasPublishableKey: !!publishableKey,
      error: "Invalid API key",
    });
  }
}
