import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/billing/plans - List all available plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      // Get specific plan by slug
      const plan = await db.query.plans.findFirst({
        where: eq(plans.slug, slug),
      });

      if (!plan) {
        return NextResponse.json(
          { error: "Plan not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ plan });
    }

    // Get all active plans
    const allPlans = await db.query.plans.findMany({
      where: eq(plans.isActive, true),
      orderBy: (plans, { asc }) => [asc(plans.priceMonthly)],
    });

    return NextResponse.json({
      success: true,
      plans: allPlans,
    });
  } catch (error: any) {
    console.error("[Billing] Error fetching plans:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch plans" },
      { status: 500 }
    );
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
        { status: 400 }
      );
    }

    const newPlan = await db.insert(plans).values({
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
    }).returning();

    return NextResponse.json({
      success: true,
      plan: newPlan[0],
    });
  } catch (error: any) {
    console.error("[Billing] Error creating plan:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create plan" },
      { status: 500 }
    );
  }
}
