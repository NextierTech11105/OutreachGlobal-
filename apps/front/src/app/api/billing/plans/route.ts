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
    description: "Perfect for solo agents getting started",
    priceMonthly: 297,
    priceYearly: 2970,
    maxUsers: 1,
    maxLeadsPerMonth: 1000,
    maxPropertySearches: 500,
    maxSmsPerMonth: 500,
    maxSkipTraces: 50,
    hasPowerDialer: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "pro",
    name: "Pro",
    slug: "pro",
    description: "For growing teams ready to scale",
    priceMonthly: 597,
    priceYearly: 5970,
    maxUsers: 3,
    maxLeadsPerMonth: 5000,
    maxPropertySearches: 2500,
    maxSmsPerMonth: 2500,
    maxSkipTraces: 250,
    hasPowerDialer: true,
    hasApiAccess: false,
    hasWhiteLabel: false,
    isPopular: true,
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "agency",
    name: "Agency",
    slug: "agency",
    description: "For established teams and brokerages",
    priceMonthly: 1497,
    priceYearly: 14970,
    maxUsers: 10,
    maxLeadsPerMonth: 25000,
    maxPropertySearches: 10000,
    maxSmsPerMonth: 10000,
    maxSkipTraces: 1000,
    hasPowerDialer: true,
    hasApiAccess: true,
    hasWhiteLabel: false,
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "white-label",
    name: "White-Label",
    slug: "white-label",
    description: "Your brand, our technology",
    priceMonthly: 2997,
    priceYearly: 29970,
    setupFee: 5000,
    maxUsers: -1, // unlimited
    maxLeadsPerMonth: 50000,
    maxPropertySearches: -1, // unlimited
    maxSmsPerMonth: 25000,
    maxSkipTraces: 2500,
    hasPowerDialer: true,
    hasApiAccess: true,
    hasWhiteLabel: true,
    isActive: true,
    displayOrder: 4,
  },
  {
    id: "developer",
    name: "Developer",
    slug: "developer",
    description: "Full API access for integrators - Annual license",
    priceMonthly: 0, // No monthly option
    priceYearly: 2997, // Annual only
    maxUsers: 1,
    maxLeadsPerMonth: 5000, // Lead enrichments
    maxPropertySearches: -1, // unlimited
    maxSmsPerMonth: 2500,
    maxSkipTraces: 1000,
    maxNevaResearch: 500,
    maxVoiceMinutes: 500,
    maxApiRequestsPerDay: 10000,
    hasPowerDialer: false,
    hasApiAccess: true,
    hasWhiteLabel: false,
    hasWebhooks: true,
    hasSla: true,
    billingType: "annual_only",
    isActive: true,
    displayOrder: 5,
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
