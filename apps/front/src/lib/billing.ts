import { db } from "@/lib/db";
import { usage, usageEvents, subscriptions } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Usage event types
export type UsageEventType =
  | "lead_created"
  | "property_search"
  | "sms_sent"
  | "skip_trace"
  | "api_call"
  | "dialer_minute";

// Overage costs in cents
const OVERAGE_COSTS: Record<UsageEventType, number> = {
  lead_created: 0,
  property_search: 5,
  sms_sent: 2,
  skip_trace: 50,
  api_call: 1,
  dialer_minute: 3,
};

interface TrackUsageResult {
  success: boolean;
  currentUsage: number;
  limit: number;
  isOverage: boolean;
  overageCharge: number;
  error?: string;
}

/**
 * Track a usage event for a user
 * Call this from any API route to automatically track usage
 */
export async function trackUsage(
  userId: string,
  eventType: UsageEventType,
  quantity: number = 1,
  metadata?: Record<string, any>,
): Promise<TrackUsageResult> {
  try {
    // Get user's active subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
      ),
      with: { plan: true },
    });

    if (!subscription) {
      // No subscription - track event but mark as billable
      await db.insert(usageEvents).values({
        userId,
        subscriptionId: "no-subscription",
        eventType,
        quantity,
        unitCost: OVERAGE_COSTS[eventType],
        metadata,
      });

      return {
        success: true,
        currentUsage: quantity,
        limit: 0,
        isOverage: true,
        overageCharge: (OVERAGE_COSTS[eventType] * quantity) / 100,
      };
    }

    // Get current period usage
    let currentUsage = await db.query.usage.findFirst({
      where: and(
        eq(usage.subscriptionId, subscription.id),
        gte(usage.periodStart, subscription.currentPeriodStart!),
        lte(usage.periodEnd, subscription.currentPeriodEnd!),
      ),
    });

    // Create usage record if it doesn't exist
    if (!currentUsage) {
      const newUsage = await db
        .insert(usage)
        .values({
          subscriptionId: subscription.id,
          userId,
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

    // Get limits from plan
    const plan = subscription.plan;
    const limits = {
      leads: plan?.maxLeadsPerMonth || 1000,
      propertySearches: plan?.maxPropertySearches || 500,
      sms: plan?.maxSmsPerMonth || 500,
      skipTraces: plan?.maxSkipTraces || 50,
    };

    // Determine which field to update
    let currentCount = 0;
    let limit = 0;
    const updateData: Record<string, number> = {};

    switch (eventType) {
      case "lead_created":
        currentCount = (currentUsage.leadsCreated || 0) + quantity;
        limit = limits.leads;
        updateData.leadsCreated = currentCount;
        break;
      case "property_search":
        currentCount = (currentUsage.propertySearches || 0) + quantity;
        limit = limits.propertySearches;
        updateData.propertySearches = currentCount;
        break;
      case "sms_sent":
        currentCount = (currentUsage.smsSent || 0) + quantity;
        limit = limits.sms;
        updateData.smsSent = currentCount;
        break;
      case "skip_trace":
        currentCount = (currentUsage.skipTraces || 0) + quantity;
        limit = limits.skipTraces;
        updateData.skipTraces = currentCount;
        break;
      default:
        currentCount = quantity;
        limit = 0;
    }

    const isOverage = currentCount > limit;

    // Update usage record
    await db.update(usage).set(updateData).where(eq(usage.id, currentUsage.id));

    // Record the event
    await db.insert(usageEvents).values({
      subscriptionId: subscription.id,
      userId,
      eventType,
      quantity,
      unitCost: isOverage ? OVERAGE_COSTS[eventType] : 0,
      metadata,
    });

    return {
      success: true,
      currentUsage: currentCount,
      limit,
      isOverage,
      overageCharge: isOverage
        ? (OVERAGE_COSTS[eventType] * quantity) / 100
        : 0,
    };
  } catch (error: any) {
    console.error("[Billing] Track usage error:", error);
    return {
      success: false,
      currentUsage: 0,
      limit: 0,
      isOverage: false,
      overageCharge: 0,
      error: error.message,
    };
  }
}

/**
 * Check if user has remaining quota for a specific feature
 */
export async function checkQuota(
  userId: string,
  eventType: UsageEventType,
): Promise<{ hasQuota: boolean; remaining: number; limit: number }> {
  try {
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
      ),
      with: { plan: true },
    });

    if (!subscription) {
      return { hasQuota: false, remaining: 0, limit: 0 };
    }

    const currentUsage = await db.query.usage.findFirst({
      where: eq(usage.subscriptionId, subscription.id),
      orderBy: (usage, { desc }) => [desc(usage.periodStart)],
    });

    if (!currentUsage) {
      // No usage yet - full quota available
      const plan = subscription.plan;
      let limit = 0;
      switch (eventType) {
        case "lead_created":
          limit = plan?.maxLeadsPerMonth || 1000;
          break;
        case "property_search":
          limit = plan?.maxPropertySearches || 500;
          break;
        case "sms_sent":
          limit = plan?.maxSmsPerMonth || 500;
          break;
        case "skip_trace":
          limit = plan?.maxSkipTraces || 50;
          break;
      }
      return { hasQuota: true, remaining: limit, limit };
    }

    let used = 0;
    let limit = 0;
    const plan = subscription.plan;

    switch (eventType) {
      case "lead_created":
        used = currentUsage.leadsCreated || 0;
        limit = plan?.maxLeadsPerMonth || 1000;
        break;
      case "property_search":
        used = currentUsage.propertySearches || 0;
        limit = plan?.maxPropertySearches || 500;
        break;
      case "sms_sent":
        used = currentUsage.smsSent || 0;
        limit = plan?.maxSmsPerMonth || 500;
        break;
      case "skip_trace":
        used = currentUsage.skipTraces || 0;
        limit = plan?.maxSkipTraces || 50;
        break;
    }

    const remaining = Math.max(0, limit - used);
    return { hasQuota: remaining > 0, remaining, limit };
  } catch (error) {
    console.error("[Billing] Check quota error:", error);
    return { hasQuota: false, remaining: 0, limit: 0 };
  }
}

/**
 * Get user's current subscription and usage summary
 */
export async function getSubscriptionSummary(userId: string) {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, "active"),
    ),
    with: { plan: true },
  });

  if (!subscription) {
    return null;
  }

  const currentUsage = await db.query.usage.findFirst({
    where: eq(usage.subscriptionId, subscription.id),
    orderBy: (usage, { desc }) => [desc(usage.periodStart)],
  });

  // Calculate remaining credits (SMS credits as primary display)
  const smsLimit = subscription.plan?.maxSmsPerMonth || 500;
  const smsUsed = currentUsage?.smsSent || 0;
  const smsRemaining = Math.max(0, smsLimit - smsUsed);

  // Also track skip trace credits (Tracerfy integration)
  const skipTraceLimit = subscription.plan?.maxSkipTraces || 50;
  const skipTraceUsed = currentUsage?.skipTraces || 0;
  const skipTraceRemaining = Math.max(0, skipTraceLimit - skipTraceUsed);

  return {
    // Flat credits field for easy UI access (SMS credits)
    credits: smsRemaining,
    skipTraceCredits: skipTraceRemaining,

    subscription: {
      id: subscription.id,
      plan: subscription.plan?.name,
      planSlug: subscription.plan?.slug,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
    usage: currentUsage
      ? {
          leads: {
            used: currentUsage.leadsCreated || 0,
            limit: subscription.plan?.maxLeadsPerMonth || 1000,
          },
          searches: {
            used: currentUsage.propertySearches || 0,
            limit: subscription.plan?.maxPropertySearches || 500,
          },
          sms: {
            used: smsUsed,
            limit: smsLimit,
            remaining: smsRemaining,
          },
          skipTraces: {
            used: skipTraceUsed,
            limit: skipTraceLimit,
            remaining: skipTraceRemaining,
          },
        }
      : null,
    features: {
      powerDialer: subscription.plan?.hasPowerDialer || false,
      apiAccess: subscription.plan?.hasApiAccess || false,
      whiteLabel: subscription.plan?.hasWhiteLabel || false,
    },
  };
}
