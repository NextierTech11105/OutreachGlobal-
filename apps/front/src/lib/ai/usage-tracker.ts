/**
 * AI Usage Tracker - Token Usage Metering Per Tenant
 *
 * Tracks AI API usage for:
 * - Cost metering and billing
 * - Usage limits enforcement
 * - Performance monitoring
 *
 * Pricing (per 1M tokens) as of Jan 2025:
 * - gpt-4o-mini: $0.15 input, $0.60 output
 * - gpt-4o: $2.50 input, $10.00 output
 * - claude-3-haiku: $0.25 input, $1.25 output
 * - claude-3.5-sonnet: $3.00 input, $15.00 output
 * - sonar-small-128k: $0.20 per request (Perplexity)
 */

import { db } from "@/lib/db";
import { aiUsageTracking, aiUsageLimits } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";

// Pricing per 1M tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number; perRequest?: number }> = {
  // OpenAI
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  // Anthropic
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  "claude-3-sonnet": { input: 3.00, output: 15.00 },
  "claude-3.5-sonnet": { input: 3.00, output: 15.00 },
  "claude-3-opus": { input: 15.00, output: 75.00 },
  // Perplexity (per request pricing)
  "llama-3.1-sonar-small-128k-online": { input: 0.20, output: 0.20, perRequest: 0.005 },
  "llama-3.1-sonar-large-128k-online": { input: 1.00, output: 1.00, perRequest: 0.005 },
};

export interface UsageRecord {
  teamId: string;
  provider: "openai" | "perplexity" | "anthropic";
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  success: boolean;
}

export interface UsageSummary {
  teamId: string;
  period: "day" | "month";
  totalTokens: number;
  totalRequests: number;
  estimatedCostUsd: number;
  breakdown: {
    provider: string;
    model: string;
    tokens: number;
    requests: number;
    cost: number;
  }[];
}

export interface UsageLimitCheck {
  allowed: boolean;
  reason?: string;
  currentUsage: {
    tokens: number;
    requests: number;
    cost: number;
  };
  limits: {
    tokens: number | null;
    requests: number | null;
    cost: number | null;
  };
  percentUsed: number;
}

/**
 * Calculate estimated cost for a usage record
 */
function calculateCost(record: UsageRecord): number {
  const pricing = MODEL_PRICING[record.model];
  if (!pricing) {
    Logger.warn("UsageTracker", `Unknown model pricing: ${record.model}`);
    return 0;
  }

  // Per-request pricing (Perplexity)
  if (pricing.perRequest) {
    return pricing.perRequest;
  }

  // Token-based pricing
  const inputCost = (record.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (record.completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Get start and end of current day in UTC
 */
function getDayBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

/**
 * Get start and end of current month in UTC
 */
function getMonthBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

/**
 * Track AI usage for a tenant
 */
export async function trackUsage(record: UsageRecord): Promise<void> {
  try {
    const { start, end } = getDayBounds();
    const estimatedCost = calculateCost(record);

    // Upsert daily aggregation
    await db
      .insert(aiUsageTracking)
      .values({
        teamId: record.teamId,
        periodStart: start,
        periodEnd: end,
        provider: record.provider,
        model: record.model,
        promptTokens: record.promptTokens,
        completionTokens: record.completionTokens,
        totalTokens: record.promptTokens + record.completionTokens,
        requestCount: 1,
        successCount: record.success ? 1 : 0,
        failureCount: record.success ? 0 : 1,
        estimatedCostUsd: String(estimatedCost),
        avgLatencyMs: record.latencyMs,
      })
      .onConflictDoUpdate({
        target: [aiUsageTracking.teamId, aiUsageTracking.periodStart, aiUsageTracking.provider, aiUsageTracking.model],
        set: {
          promptTokens: sql`${aiUsageTracking.promptTokens} + ${record.promptTokens}`,
          completionTokens: sql`${aiUsageTracking.completionTokens} + ${record.completionTokens}`,
          totalTokens: sql`${aiUsageTracking.totalTokens} + ${record.promptTokens + record.completionTokens}`,
          requestCount: sql`${aiUsageTracking.requestCount} + 1`,
          successCount: record.success
            ? sql`${aiUsageTracking.successCount} + 1`
            : aiUsageTracking.successCount,
          failureCount: record.success
            ? aiUsageTracking.failureCount
            : sql`${aiUsageTracking.failureCount} + 1`,
          estimatedCostUsd: sql`CAST(${aiUsageTracking.estimatedCostUsd} AS DECIMAL(12,6)) + ${estimatedCost}`,
          avgLatencyMs: sql`(${aiUsageTracking.avgLatencyMs} * ${aiUsageTracking.requestCount} + ${record.latencyMs}) / (${aiUsageTracking.requestCount} + 1)`,
          updatedAt: new Date(),
        },
      });

    Logger.debug("UsageTracker", "Usage tracked", {
      teamId: record.teamId,
      provider: record.provider,
      model: record.model,
      tokens: record.promptTokens + record.completionTokens,
      cost: estimatedCost.toFixed(6),
    });
  } catch (error) {
    Logger.error("UsageTracker", "Failed to track usage", {
      error: error instanceof Error ? error.message : "Unknown",
      teamId: record.teamId,
    });
    // Don't throw - usage tracking should not block AI calls
  }
}

/**
 * Check if tenant is within usage limits
 */
export async function checkUsageLimits(teamId: string): Promise<UsageLimitCheck> {
  try {
    // Get tenant limits
    const [limits] = await db
      .select()
      .from(aiUsageLimits)
      .where(eq(aiUsageLimits.teamId, teamId))
      .limit(1);

    // If no limits configured, allow all
    if (!limits || !limits.isEnabled) {
      return {
        allowed: true,
        currentUsage: { tokens: 0, requests: 0, cost: 0 },
        limits: { tokens: null, requests: null, cost: null },
        percentUsed: 0,
      };
    }

    // Get current daily usage
    const { start: dayStart, end: dayEnd } = getDayBounds();
    const dailyUsage = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${aiUsageTracking.totalTokens}), 0)`,
        totalRequests: sql<number>`COALESCE(SUM(${aiUsageTracking.requestCount}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(CAST(${aiUsageTracking.estimatedCostUsd} AS DECIMAL(12,6))), 0)`,
      })
      .from(aiUsageTracking)
      .where(
        and(
          eq(aiUsageTracking.teamId, teamId),
          gte(aiUsageTracking.periodStart, dayStart),
          lte(aiUsageTracking.periodEnd, dayEnd)
        )
      );

    // Get current monthly usage
    const { start: monthStart, end: monthEnd } = getMonthBounds();
    const monthlyUsage = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${aiUsageTracking.totalTokens}), 0)`,
        totalRequests: sql<number>`COALESCE(SUM(${aiUsageTracking.requestCount}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(CAST(${aiUsageTracking.estimatedCostUsd} AS DECIMAL(12,6))), 0)`,
      })
      .from(aiUsageTracking)
      .where(
        and(
          eq(aiUsageTracking.teamId, teamId),
          gte(aiUsageTracking.periodStart, monthStart),
          lte(aiUsageTracking.periodEnd, monthEnd)
        )
      );

    const daily = dailyUsage[0] || { totalTokens: 0, totalRequests: 0, totalCost: 0 };
    const monthly = monthlyUsage[0] || { totalTokens: 0, totalRequests: 0, totalCost: 0 };

    // Check daily limits
    if (limits.dailyTokenLimit && daily.totalTokens >= limits.dailyTokenLimit) {
      return {
        allowed: false,
        reason: "Daily token limit exceeded",
        currentUsage: { tokens: daily.totalTokens, requests: daily.totalRequests, cost: Number(daily.totalCost) },
        limits: { tokens: limits.dailyTokenLimit, requests: limits.dailyRequestLimit, cost: null },
        percentUsed: 100,
      };
    }

    if (limits.dailyRequestLimit && daily.totalRequests >= limits.dailyRequestLimit) {
      return {
        allowed: false,
        reason: "Daily request limit exceeded",
        currentUsage: { tokens: daily.totalTokens, requests: daily.totalRequests, cost: Number(daily.totalCost) },
        limits: { tokens: limits.dailyTokenLimit, requests: limits.dailyRequestLimit, cost: null },
        percentUsed: 100,
      };
    }

    // Check monthly limits
    if (limits.monthlyTokenLimit && monthly.totalTokens >= limits.monthlyTokenLimit) {
      return {
        allowed: false,
        reason: "Monthly token limit exceeded",
        currentUsage: { tokens: monthly.totalTokens, requests: monthly.totalRequests, cost: Number(monthly.totalCost) },
        limits: { tokens: limits.monthlyTokenLimit, requests: limits.monthlyRequestLimit, cost: limits.monthlyCostLimitUsd ? Number(limits.monthlyCostLimitUsd) : null },
        percentUsed: 100,
      };
    }

    if (limits.monthlyRequestLimit && monthly.totalRequests >= limits.monthlyRequestLimit) {
      return {
        allowed: false,
        reason: "Monthly request limit exceeded",
        currentUsage: { tokens: monthly.totalTokens, requests: monthly.totalRequests, cost: Number(monthly.totalCost) },
        limits: { tokens: limits.monthlyTokenLimit, requests: limits.monthlyRequestLimit, cost: limits.monthlyCostLimitUsd ? Number(limits.monthlyCostLimitUsd) : null },
        percentUsed: 100,
      };
    }

    if (limits.monthlyCostLimitUsd && Number(monthly.totalCost) >= Number(limits.monthlyCostLimitUsd)) {
      return {
        allowed: false,
        reason: "Monthly cost limit exceeded",
        currentUsage: { tokens: monthly.totalTokens, requests: monthly.totalRequests, cost: Number(monthly.totalCost) },
        limits: { tokens: limits.monthlyTokenLimit, requests: limits.monthlyRequestLimit, cost: Number(limits.monthlyCostLimitUsd) },
        percentUsed: 100,
      };
    }

    // Calculate percent used (based on most restrictive limit)
    let percentUsed = 0;
    if (limits.monthlyTokenLimit) {
      percentUsed = Math.max(percentUsed, (monthly.totalTokens / limits.monthlyTokenLimit) * 100);
    }
    if (limits.monthlyCostLimitUsd) {
      percentUsed = Math.max(percentUsed, (Number(monthly.totalCost) / Number(limits.monthlyCostLimitUsd)) * 100);
    }

    return {
      allowed: true,
      currentUsage: { tokens: monthly.totalTokens, requests: monthly.totalRequests, cost: Number(monthly.totalCost) },
      limits: {
        tokens: limits.monthlyTokenLimit,
        requests: limits.monthlyRequestLimit,
        cost: limits.monthlyCostLimitUsd ? Number(limits.monthlyCostLimitUsd) : null
      },
      percentUsed: Math.round(percentUsed),
    };
  } catch (error) {
    Logger.error("UsageTracker", "Failed to check usage limits", {
      error: error instanceof Error ? error.message : "Unknown",
      teamId,
    });
    // On error, allow the request (fail open)
    return {
      allowed: true,
      currentUsage: { tokens: 0, requests: 0, cost: 0 },
      limits: { tokens: null, requests: null, cost: null },
      percentUsed: 0,
    };
  }
}

/**
 * Get usage summary for a tenant
 */
export async function getUsageSummary(teamId: string, period: "day" | "month" = "month"): Promise<UsageSummary> {
  const { start, end } = period === "day" ? getDayBounds() : getMonthBounds();

  const usage = await db
    .select({
      provider: aiUsageTracking.provider,
      model: aiUsageTracking.model,
      totalTokens: sql<number>`COALESCE(SUM(${aiUsageTracking.totalTokens}), 0)`,
      totalRequests: sql<number>`COALESCE(SUM(${aiUsageTracking.requestCount}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(CAST(${aiUsageTracking.estimatedCostUsd} AS DECIMAL(12,6))), 0)`,
    })
    .from(aiUsageTracking)
    .where(
      and(
        eq(aiUsageTracking.teamId, teamId),
        gte(aiUsageTracking.periodStart, start),
        lte(aiUsageTracking.periodEnd, end)
      )
    )
    .groupBy(aiUsageTracking.provider, aiUsageTracking.model);

  const breakdown = usage.map((u) => ({
    provider: u.provider,
    model: u.model,
    tokens: u.totalTokens,
    requests: u.totalRequests,
    cost: Number(u.totalCost),
  }));

  const totalTokens = breakdown.reduce((sum, b) => sum + b.tokens, 0);
  const totalRequests = breakdown.reduce((sum, b) => sum + b.requests, 0);
  const estimatedCostUsd = breakdown.reduce((sum, b) => sum + b.cost, 0);

  return {
    teamId,
    period,
    totalTokens,
    totalRequests,
    estimatedCostUsd,
    breakdown,
  };
}

/**
 * Set usage limits for a tenant
 */
export async function setUsageLimits(
  teamId: string,
  limits: Partial<{
    monthlyTokenLimit: number | null;
    monthlyRequestLimit: number | null;
    monthlyCostLimitUsd: number | null;
    dailyTokenLimit: number | null;
    dailyRequestLimit: number | null;
    alertThresholdPercent: number;
    isEnabled: boolean;
  }>
): Promise<void> {
  await db
    .insert(aiUsageLimits)
    .values({
      teamId,
      ...limits,
      monthlyCostLimitUsd: limits.monthlyCostLimitUsd?.toString(),
    })
    .onConflictDoUpdate({
      target: [aiUsageLimits.teamId],
      set: {
        ...limits,
        monthlyCostLimitUsd: limits.monthlyCostLimitUsd?.toString(),
        updatedAt: new Date(),
      },
    });
}
