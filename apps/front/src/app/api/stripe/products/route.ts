import { NextRequest, NextResponse } from "next/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Default pricing plans to create
const DEFAULT_PLANS = [
  {
    name: "Starter",
    description: "Perfect for small teams getting started with outreach",
    monthlyPrice: 9900, // $99
    yearlyPrice: 99000, // $990 (2 months free)
    features: [
      "1,000 leads/month",
      "500 skip traces/month",
      "2,000 SMS/month",
      "Basic analytics",
      "Email support",
    ],
    metadata: {
      slug: "starter",
      maxLeadsPerMonth: "1000",
      maxSkipTraces: "500",
      maxSmsPerMonth: "2000",
    },
  },
  {
    name: "Professional",
    description: "For growing teams with advanced needs",
    monthlyPrice: 29900, // $299
    yearlyPrice: 299000, // $2,990 (2 months free)
    features: [
      "5,000 leads/month",
      "2,500 skip traces/month",
      "10,000 SMS/month",
      "Advanced analytics",
      "Priority support",
      "API access",
    ],
    metadata: {
      slug: "professional",
      maxLeadsPerMonth: "5000",
      maxSkipTraces: "2500",
      maxSmsPerMonth: "10000",
    },
  },
  {
    name: "Enterprise",
    description: "Unlimited power for large organizations",
    monthlyPrice: 79900, // $799
    yearlyPrice: 799000, // $7,990 (2 months free)
    features: [
      "Unlimited leads",
      "10,000 skip traces/month",
      "50,000 SMS/month",
      "Custom analytics",
      "Dedicated support",
      "White-label options",
      "Custom integrations",
    ],
    metadata: {
      slug: "enterprise",
      maxLeadsPerMonth: "unlimited",
      maxSkipTraces: "10000",
      maxSmsPerMonth: "50000",
    },
  },
];

// GET /api/stripe/products - List all products and prices
export async function GET() {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const products = await stripe.products.list({ limit: 100, active: true });
    const prices = await stripe.prices.list({ limit: 100, active: true });

    // Map prices to products
    const productsWithPrices = products.data.map((product) => {
      const productPrices = prices.data.filter((p) => p.product === product.id);
      const monthlyPrice = productPrices.find(
        (p) => p.recurring?.interval === "month",
      );
      const yearlyPrice = productPrices.find(
        (p) => p.recurring?.interval === "year",
      );

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        features: product.features?.map((f) => f.name) || [],
        monthlyPrice: monthlyPrice
          ? {
              id: monthlyPrice.id,
              amount: monthlyPrice.unit_amount,
              currency: monthlyPrice.currency,
            }
          : null,
        yearlyPrice: yearlyPrice
          ? {
              id: yearlyPrice.id,
              amount: yearlyPrice.unit_amount,
              currency: yearlyPrice.currency,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      products: productsWithPrices,
      totalProducts: products.data.length,
      totalPrices: prices.data.length,
    });
  } catch (error: any) {
    console.error("[Stripe Products] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// POST /api/stripe/products - Create default pricing plans
export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { action, plans } = body;

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    if (action === "create-defaults") {
      // Create default plans
      const plansToCreate = plans || DEFAULT_PLANS;
      const createdProducts = [];

      for (const plan of plansToCreate) {
        // Create product
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: plan.metadata,
          features: plan.features?.map((f: string) => ({ name: f })),
        });

        // Create monthly price
        const monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.monthlyPrice,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: { plan: plan.metadata.slug, interval: "monthly" },
        });

        // Create yearly price
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.yearlyPrice,
          currency: "usd",
          recurring: { interval: "year" },
          metadata: { plan: plan.metadata.slug, interval: "yearly" },
        });

        createdProducts.push({
          product: {
            id: product.id,
            name: product.name,
          },
          monthlyPriceId: monthlyPrice.id,
          yearlyPriceId: yearlyPrice.id,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Created ${createdProducts.length} products with prices`,
        products: createdProducts,
      });
    }

    if (action === "create-single") {
      const {
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        features,
        metadata,
      } = body;

      const product = await stripe.products.create({
        name,
        description,
        metadata,
        features: features?.map((f: string) => ({ name: f })),
      });

      const monthly = await stripe.prices.create({
        product: product.id,
        unit_amount: monthlyPrice,
        currency: "usd",
        recurring: { interval: "month" },
      });

      const yearly = await stripe.prices.create({
        product: product.id,
        unit_amount: yearlyPrice,
        currency: "usd",
        recurring: { interval: "year" },
      });

      return NextResponse.json({
        success: true,
        product: {
          id: product.id,
          name: product.name,
          monthlyPriceId: monthly.id,
          yearlyPriceId: yearly.id,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'create-defaults' or 'create-single'" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[Stripe Products] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create products" },
      { status: 500 },
    );
  }
}

// DELETE /api/stripe/products - Archive a product
export async function DELETE(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Archive the product (can't delete if it has prices)
    await stripe.products.update(productId, { active: false });

    return NextResponse.json({
      success: true,
      message: "Product archived successfully",
    });
  } catch (error: any) {
    console.error("[Stripe Products] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to archive product" },
      { status: 500 },
    );
  }
}
