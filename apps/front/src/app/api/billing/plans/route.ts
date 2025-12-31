import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Default plans when DB not available
const DEFAULT_PLANS = [
  {
    id: "starter",
    name: "Starter",
    slug: "starter",
    description: "Perfect for getting started",
    priceMonthly: 49,
    priceYearly: 490,
    maxUsers: 1,
    maxLeadsPerMonth: 1000,
    maxPropertySearches: 500,
    maxSmsPerMonth: 500,
    maxSkipTraces: 50,
    hasPowerDialer: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    isActive: true,
  },
  {
    id: "professional",
    name: "Professional",
    slug: "professional",
    description: "For growing teams",
    priceMonthly: 149,
    priceYearly: 1490,
    maxUsers: 5,
    maxLeadsPerMonth: 10000,
    maxPropertySearches: 2500,
    maxSmsPerMonth: 2500,
    maxSkipTraces: 250,
    hasPowerDialer: true,
    hasApiAccess: true,
    hasWhiteLabel: false,
    isActive: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    slug: "enterprise",
    description: "Unlimited power",
    priceMonthly: 499,
    priceYearly: 4990,
    maxUsers: 25,
    maxLeadsPerMonth: 100000,
    maxPropertySearches: 10000,
    maxSmsPerMonth: 10000,
    maxSkipTraces: 1000,
    hasPowerDialer: true,
    hasApiAccess: true,
    hasWhiteLabel: true,
    isActive: true,
  },
];

// GET /api/billing/plans - List all available plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    // Try database first
    try {
      if (slug) {
        const plan = await db.query.plans.findFirst({
          where: eq(plans.slug, slug),
        });

        if (!plan) {
          // Fallback to default plans
          const defaultPlan = DEFAULT_PLANS.find((p) => p.slug === slug);
          if (defaultPlan) {
            return NextResponse.json({ plan: defaultPlan });
          }
          return NextResponse.json(
            { error: "Plan not found" },
            { status: 404 },
          );
        }

        return NextResponse.json({ plan });
      }

      const allPlans = await db.query.plans.findMany({
        where: eq(plans.isActive, true),
        orderBy: (plans, { asc }) => [asc(plans.priceMonthly)],
      });

      if (allPlans.length > 0) {
        return NextResponse.json({ success: true, plans: allPlans });
      }
    } catch (dbError) {
      console.warn("[Billing] DB unavailable, using defaults:", dbError);
    }

    // Fallback to default plans
    if (slug) {
      const plan = DEFAULT_PLANS.find((p) => p.slug === slug);
      if (!plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      return NextResponse.json({ plan });
    }

    return NextResponse.json({
      success: true,
      plans: DEFAULT_PLANS,
      source: "default",
    });
  } catch (error: unknown) {
    console.error("[Billing] Error fetching plans:", error);
    // Even on error, return default plans
    return NextResponse.json({
      success: true,
      plans: DEFAULT_PLANS,
      source: "fallback",
    });
  }
}

// POST /api/billing/plans - Create a new plan (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Add admin authentication check
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const {
      name,
      slug,
      description,
      priceMonthly,
      priceYearly,
      maxUsers,
      maxLeadsPerMonth,
      maxPropertySearches,
      maxSmsPerMonth,
      maxSkipTraces,
      hasPowerDialer,
      hasApiAccess,
      hasWhiteLabel,
      stripePriceIdMonthly,
      stripePriceIdYearly,
    } = body;

    if (!name || !slug || priceMonthly === undefined) {
      return NextResponse.json(
        { error: "name, slug, and priceMonthly are required" },
        { status: 400 },
      );
    }

    const newPlan = await db
      .insert(plans)
      .values({
        name,
        slug,
        description,
        priceMonthly,
        priceYearly: priceYearly || priceMonthly * 10, // 2 months free default
        maxUsers: maxUsers || 1,
        maxLeadsPerMonth: maxLeadsPerMonth || 1000,
        maxPropertySearches: maxPropertySearches || 500,
        maxSmsPerMonth: maxSmsPerMonth || 500,
        maxSkipTraces: maxSkipTraces || 50,
        hasPowerDialer: hasPowerDialer || false,
        hasApiAccess: hasApiAccess || false,
        hasWhiteLabel: hasWhiteLabel || false,
        stripePriceIdMonthly,
        stripePriceIdYearly,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      plan: newPlan[0],
    });
  } catch (error: any) {
    console.error("[Billing] Error creating plan:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create plan" },
      { status: 500 },
    );
  }
}
