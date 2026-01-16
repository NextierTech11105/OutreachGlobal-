import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usage, usageEvents, subscriptions } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// Usage event types
type UsageEventType =
  | "lead_created"
  | "property_search"
  | "sms_sent"
  | "skip_trace"
  | "api_call"
  | "dialer_minute";

// Unit costs for overage (in cents)
const OVERAGE_COSTS: Record<UsageEventType, number> = {
  lead_created: 0, // Included in plan
  property_search: 5, // $0.05 per search overage
  sms_sent: 2, // $0.02 per SMS
  skip_trace: 50, // $0.50 per trace
  api_call: 1, // $0.01 per API call
  dialer_minute: 3, // $0.03 per minute
};

// Default usage response when DB unavailable
const DEFAULT_USAGE_RESPONSE = {
  success: true,
  subscription: {
    id: "demo",
    plan: "Professional",
    status: "active",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  },
  usage: {
    leads: { used: 0, limit: 10000, percentage: 0, overage: 0 },
    propertySearches: { used: 0, limit: 5000, percentage: 0, overage: 0 },
    sms: { used: 0, limit: 2500, percentage: 0, overage: 0 },
    skipTraces: { used: 0, limit: 500, percentage: 0, overage: 0 },
  },
  overageCharges: 0,
  history: [],
};

// GET /api/billing/usage - Get usage for a subscription
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const subscriptionId = searchParams.get("subscriptionId");
    const includeHistory = searchParams.get("history") === "true";

    if (!userId && !subscriptionId) {
      return NextResponse.json(
        { error: "userId or subscriptionId is required" },
        { status: 400 },
      );
    }

    // Check if database is available
    if (!db || !db.query) {
      console.warn("[Billing] Database not available, returning default usage");
      return NextResponse.json(DEFAULT_USAGE_RESPONSE);
    }

    // Get subscription
    let subscription;
    try {
      if (subscriptionId) {
        subscription = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.id, subscriptionId),
          with: { plan: true },
        });
      } else {
        subscription = await db.query.subscriptions.findFirst({
          where: and(
            eq(subscriptions.userId, userId!),
            eq(subscriptions.status, "active"),
          ),
          with: { plan: true },
        });
      }
    } catch (dbError) {
      console.warn(
        "[Billing] Database query failed, returning default usage:",
        dbError,
      );
      return NextResponse.json(DEFAULT_USAGE_RESPONSE);
    }

    if (!subscription) {
      return NextResponse.json({
        success: true,
        usage: null,
        message: "No active subscription",
      });
    }

    // Get current period usage
    const currentUsage = await db.query.usage.findFirst({
      where: eq(usage.subscriptionId, subscription.id),
      orderBy: desc(usage.periodStart),
    });

    // Calculate percentages and overage
    const plan = subscription.plan;
    const usageData = {
      leads: {
        used: currentUsage?.leadsCreated || 0,
        limit: plan?.maxLeadsPerMonth || 1000,
        percentage: Math.round(
          ((currentUsage?.leadsCreated || 0) /
            (plan?.maxLeadsPerMonth || 1000)) *
            100,
        ),
        overage: Math.max(
          0,
          (currentUsage?.leadsCreated || 0) - (plan?.maxLeadsPerMonth || 1000),
        ),
      },
      propertySearches: {
        used: currentUsage?.propertySearches || 0,
        limit: plan?.maxPropertySearches || 500,
        percentage: Math.round(
          ((currentUsage?.propertySearches || 0) /
            (plan?.maxPropertySearches || 500)) *
            100,
        ),
        overage: Math.max(
          0,
          (currentUsage?.propertySearches || 0) -
            (plan?.maxPropertySearches || 500),
        ),
      },
      sms: {
        used: currentUsage?.smsSent || 0,
        limit: plan?.maxSmsPerMonth || 500,
        percentage: Math.round(
          ((currentUsage?.smsSent || 0) / (plan?.maxSmsPerMonth || 500)) * 100,
        ),
        overage: Math.max(
          0,
          (currentUsage?.smsSent || 0) - (plan?.maxSmsPerMonth || 500),
        ),
      },
      skipTraces: {
        used: currentUsage?.skipTraces || 0,
        limit: plan?.maxSkipTraces || 50,
        percentage: Math.round(
          ((currentUsage?.skipTraces || 0) / (plan?.maxSkipTraces || 50)) * 100,
        ),
        overage: Math.max(
          0,
          (currentUsage?.skipTraces || 0) - (plan?.maxSkipTraces || 50),
        ),
      },
    };

    // Calculate overage charges
    const overageCharges =
      usageData.propertySearches.overage * OVERAGE_COSTS.property_search +
      usageData.sms.overage * OVERAGE_COSTS.sms_sent +
      usageData.skipTraces.overage * OVERAGE_COSTS.skip_trace;

    const response: any = {
      success: true,
      subscription: {
        id: subscription.id,
        plan: plan?.name,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      usage: usageData,
      overageCharges: overageCharges / 100, // Convert to dollars
    };

    // Include usage history if requested
    if (includeHistory) {
      const history = await db
        .select()
        .from(usage)
        .where(eq(usage.subscriptionId, subscription.id))
        .orderBy(desc(usage.periodStart))
        .limit(12);

      response.history = history;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Billing] Error fetching usage:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch usage" },
      { status: 500 },
    );
  }
}

// POST /api/billing/usage - Record a usage event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, eventType, quantity = 1, metadata } = body;

    if (!userId || !eventType) {
      return NextResponse.json(
        { error: "userId and eventType are required" },
        { status: 400 },
      );
    }

    // Validate event type
    const validEventTypes: UsageEventType[] = [
      "lead_created",
      "property_search",
      "sms_sent",
      "skip_trace",
      "api_call",
      "dialer_minute",
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        {
          error: `Invalid event type. Must be one of: ${validEventTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Get user's subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
      ),
      with: { plan: true },
    });

    if (!subscription) {
      // No subscription - still track for potential billing
      await db.insert(usageEvents).values({
        userId,
        subscriptionId: "none",
        eventType,
        quantity,
        unitCost: OVERAGE_COSTS[eventType as UsageEventType],
        metadata,
      });

      return NextResponse.json({
        success: true,
        warning: "No active subscription - usage tracked for billing",
        billable: true,
      });
    }

    // Get or create current period usage record
    let currentUsage = await db.query.usage.findFirst({
      where: and(
        eq(usage.subscriptionId, subscription.id),
        gte(usage.periodStart, subscription.currentPeriodStart!),
        lte(usage.periodEnd, subscription.currentPeriodEnd!),
      ),
    });

    if (!currentUsage) {
      // Create usage record for current period
      const newUsage = await db
        .insert(usage)
        .values({
          userId,
          subscriptionId: subscription.id,
          periodStart: subscription.currentPeriodStart!,
          periodEnd: subscription.currentPeriodEnd!,
          leadsCreated: 0,
          propertySearches: 0,
          smsSent: 0,
          skipTraces: 0,
        })
        .returning();
      currentUsage = newUsage[0];
    }

    // Update usage based on event type
    const updateData: Record<string, number> = {};
    let isOverage = false;
    let currentCount = 0;
    const plan = subscription.plan;
    let limit = 0;

    switch (eventType) {
      case "lead_created":
        currentCount = (currentUsage.leadsCreated || 0) + quantity;
        limit = plan?.maxLeadsPerMonth || 1000;
        updateData.leadsCreated = currentCount;
        break;
      case "property_search":
        currentCount = (currentUsage.propertySearches || 0) + quantity;
        limit = plan?.maxPropertySearches || 500;
        updateData.propertySearches = currentCount;
        break;
      case "sms_sent":
        currentCount = (currentUsage.smsSent || 0) + quantity;
        limit = plan?.maxSmsPerMonth || 500;
        updateData.smsSent = currentCount;
        break;
      case "skip_trace":
        currentCount = (currentUsage.skipTraces || 0) + quantity;
        limit = plan?.maxSkipTraces || 50;
        updateData.skipTraces = currentCount;
        break;
    }

    isOverage = currentCount > limit;

    // Update usage record
    await db.update(usage).set(updateData).where(eq(usage.id, currentUsage.id));

    // Record the event
    await db.insert(usageEvents).values({
      subscriptionId: subscription.id,
      userId,
      eventType,
      quantity,
      unitCost: isOverage ? OVERAGE_COSTS[eventType as UsageEventType] : 0,
      metadata,
    });

    return NextResponse.json({
      success: true,
      eventType,
      quantity,
      currentUsage: currentCount,
      limit,
      isOverage,
      overageCharge: isOverage
        ? (OVERAGE_COSTS[eventType as UsageEventType] * quantity) / 100
        : 0,
    });
  } catch (error: any) {
    console.error("[Billing] Error recording usage:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record usage" },
      { status: 500 },
    );
  }
}
