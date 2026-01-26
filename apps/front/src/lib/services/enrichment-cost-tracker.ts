/**
 * Enrichment Cost Tracking Service
 *
 * Tracks costs and usage across all enrichment sources:
 * - RealEstateAPI (Skip Trace)
 * - Apollo.io (B2B Enrichment)
 * - Perplexity (NEVA Research)
 *
 * Provides monthly aggregation and cost alerts.
 */

import { redis, isRedisAvailable } from "@/lib/redis";

// Cost per operation (in cents)
export const ENRICHMENT_COSTS = {
  // Tracerfy Skip Trace (UPDATED 2026-01-25)
  skip_trace_single: 2, // $0.02 per trace (Tracerfy)
  skip_trace_bulk: 2, // $0.02 per trace in bulk (Tracerfy)

  // Trestle Real Contact (phone validation/scoring)
  trestle_validate: 1.5, // $0.015 per phone validation
  trestle_real_contact: 3, // $0.03 per real contact score

  // Apollo.io
  apollo_person_enrich: 10, // $0.10 per person enrichment
  apollo_company_enrich: 5, // $0.05 per company enrichment
  apollo_search: 2, // $0.02 per search

  // Perplexity (NEVA)
  neva_quick_validation: 5, // $0.05 per validation
  neva_deep_research: 25, // $0.25 per deep research
  neva_market_sizing: 50, // $0.50 per market sizing
} as const;

export type EnrichmentSource = "skip_trace" | "trestle" | "apollo" | "neva";
export type EnrichmentOperation = keyof typeof ENRICHMENT_COSTS;

interface UsageRecord {
  operation: EnrichmentOperation;
  count: number;
  costCents: number;
  timestamp: string;
}

interface DailyUsage {
  date: string;
  bySource: Record<EnrichmentSource, number>;
  byCost: Record<EnrichmentSource, number>;
  totalOperations: number;
  totalCostCents: number;
}

interface MonthlyUsage {
  month: string;
  bySource: Record<EnrichmentSource, { operations: number; costCents: number }>;
  totalOperations: number;
  totalCostCents: number;
  dailyBreakdown: DailyUsage[];
}

// Redis keys
const getRedisKey = (prefix: string, date: string) =>
  `enrichment:${prefix}:${date}`;

/**
 * Get the source from an operation type
 */
function getSourceFromOperation(
  operation: EnrichmentOperation,
): EnrichmentSource {
  if (operation.startsWith("skip_trace")) return "skip_trace";
  if (operation.startsWith("trestle")) return "trestle";
  if (operation.startsWith("apollo")) return "apollo";
  if (operation.startsWith("neva")) return "neva";
  return "skip_trace"; // fallback
}

/**
 * Track an enrichment operation
 */
export async function trackEnrichmentUsage(
  operation: EnrichmentOperation,
  count: number = 1,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; totalCostCents: number }> {
  const costCents = ENRICHMENT_COSTS[operation] * count;
  const source = getSourceFromOperation(operation);
  const today = new Date().toISOString().split("T")[0];
  const month = today.substring(0, 7);

  console.log(
    `[EnrichmentTracker] ${operation} x${count} = $${(costCents / 100).toFixed(2)}`,
  );

  if (!isRedisAvailable()) {
    console.warn(
      "[EnrichmentTracker] Redis not available, tracking in-memory only",
    );
    return { success: true, totalCostCents: costCents };
  }

  try {
    const redis_ = redis!;

    // Track daily stats
    const dailyKey = getRedisKey("daily", today);
    await redis_.hincrby(dailyKey, `ops:${source}`, count);
    await redis_.hincrby(dailyKey, `cost:${source}`, costCents);
    await redis_.hincrby(dailyKey, "total_ops", count);
    await redis_.hincrby(dailyKey, "total_cost", costCents);
    await redis_.expire(dailyKey, 60 * 60 * 24 * 90); // 90 days

    // Track monthly stats
    const monthlyKey = getRedisKey("monthly", month);
    await redis_.hincrby(monthlyKey, `ops:${source}`, count);
    await redis_.hincrby(monthlyKey, `cost:${source}`, costCents);
    await redis_.hincrby(monthlyKey, "total_ops", count);
    await redis_.hincrby(monthlyKey, "total_cost", costCents);
    await redis_.expire(monthlyKey, 60 * 60 * 24 * 400); // 400 days

    // Track operation breakdown
    const opKey = getRedisKey("ops", today);
    await redis_.hincrby(opKey, operation, count);
    await redis_.expire(opKey, 60 * 60 * 24 * 90);

    // Log individual operation for audit
    const auditKey = getRedisKey("audit", today);
    const auditRecord: UsageRecord = {
      operation,
      count,
      costCents,
      timestamp: new Date().toISOString(),
    };
    await redis_.rpush(auditKey, JSON.stringify(auditRecord));
    await redis_.expire(auditKey, 60 * 60 * 24 * 30); // 30 days

    return { success: true, totalCostCents: costCents };
  } catch (error) {
    console.error("[EnrichmentTracker] Failed to track:", error);
    return { success: false, totalCostCents: costCents };
  }
}

/**
 * Get daily usage stats
 */
export async function getDailyEnrichmentUsage(
  date: string = new Date().toISOString().split("T")[0],
): Promise<DailyUsage> {
  const emptyUsage: DailyUsage = {
    date,
    bySource: { skip_trace: 0, trestle: 0, apollo: 0, neva: 0 },
    byCost: { skip_trace: 0, trestle: 0, apollo: 0, neva: 0 },
    totalOperations: 0,
    totalCostCents: 0,
  };

  if (!isRedisAvailable()) {
    return emptyUsage;
  }

  try {
    const redis_ = redis!;
    const dailyKey = getRedisKey("daily", date);
    const data = await redis_.hgetall(dailyKey);

    if (!data || Object.keys(data).length === 0) {
      return emptyUsage;
    }

    return {
      date,
      bySource: {
        skip_trace: parseInt(data["ops:skip_trace"] || "0", 10),
        trestle: parseInt(data["ops:trestle"] || "0", 10),
        apollo: parseInt(data["ops:apollo"] || "0", 10),
        neva: parseInt(data["ops:neva"] || "0", 10),
      },
      byCost: {
        skip_trace: parseInt(data["cost:skip_trace"] || "0", 10),
        trestle: parseInt(data["cost:trestle"] || "0", 10),
        apollo: parseInt(data["cost:apollo"] || "0", 10),
        neva: parseInt(data["cost:neva"] || "0", 10),
      },
      totalOperations: parseInt(data["total_ops"] || "0", 10),
      totalCostCents: parseInt(data["total_cost"] || "0", 10),
    };
  } catch (error) {
    console.error("[EnrichmentTracker] Failed to get daily usage:", error);
    return emptyUsage;
  }
}

/**
 * Get monthly usage stats
 */
export async function getMonthlyEnrichmentUsage(
  month: string = new Date().toISOString().substring(0, 7),
): Promise<MonthlyUsage> {
  const emptyUsage: MonthlyUsage = {
    month,
    bySource: {
      skip_trace: { operations: 0, costCents: 0 },
      trestle: { operations: 0, costCents: 0 },
      apollo: { operations: 0, costCents: 0 },
      neva: { operations: 0, costCents: 0 },
    },
    totalOperations: 0,
    totalCostCents: 0,
    dailyBreakdown: [],
  };

  if (!isRedisAvailable()) {
    return emptyUsage;
  }

  try {
    const redis_ = redis!;
    const monthlyKey = getRedisKey("monthly", month);
    const data = await redis_.hgetall(monthlyKey);

    if (!data || Object.keys(data).length === 0) {
      return emptyUsage;
    }

    return {
      month,
      bySource: {
        skip_trace: {
          operations: parseInt(data["ops:skip_trace"] || "0", 10),
          costCents: parseInt(data["cost:skip_trace"] || "0", 10),
        },
        trestle: {
          operations: parseInt(data["ops:trestle"] || "0", 10),
          costCents: parseInt(data["cost:trestle"] || "0", 10),
        },
        apollo: {
          operations: parseInt(data["ops:apollo"] || "0", 10),
          costCents: parseInt(data["cost:apollo"] || "0", 10),
        },
        neva: {
          operations: parseInt(data["ops:neva"] || "0", 10),
          costCents: parseInt(data["cost:neva"] || "0", 10),
        },
      },
      totalOperations: parseInt(data["total_ops"] || "0", 10),
      totalCostCents: parseInt(data["total_cost"] || "0", 10),
      dailyBreakdown: [], // Can be populated with getDailyEnrichmentUsage calls
    };
  } catch (error) {
    console.error("[EnrichmentTracker] Failed to get monthly usage:", error);
    return emptyUsage;
  }
}

/**
 * Get operation breakdown for a day
 */
export async function getOperationBreakdown(
  date: string = new Date().toISOString().split("T")[0],
): Promise<Record<EnrichmentOperation, number>> {
  const empty: Record<string, number> = {};

  if (!isRedisAvailable()) {
    return empty as Record<EnrichmentOperation, number>;
  }

  try {
    const redis_ = redis!;
    const opKey = getRedisKey("ops", date);
    const data = await redis_.hgetall(opKey);

    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(data || {})) {
      result[key] = parseInt(value, 10);
    }

    return result as Record<EnrichmentOperation, number>;
  } catch (error) {
    console.error(
      "[EnrichmentTracker] Failed to get operation breakdown:",
      error,
    );
    return empty as Record<EnrichmentOperation, number>;
  }
}

/**
 * Check if monthly budget exceeded
 */
export async function checkBudgetAlert(
  monthlyBudgetCents: number = 50000, // $500 default
): Promise<{
  exceeded: boolean;
  currentSpend: number;
  budget: number;
  percentUsed: number;
}> {
  const usage = await getMonthlyEnrichmentUsage();

  const percentUsed = Math.round(
    (usage.totalCostCents / monthlyBudgetCents) * 100,
  );

  return {
    exceeded: usage.totalCostCents > monthlyBudgetCents,
    currentSpend: usage.totalCostCents,
    budget: monthlyBudgetCents,
    percentUsed,
  };
}

/**
 * Format cost for display
 */
export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get enrichment cost summary
 */
export async function getEnrichmentCostSummary(): Promise<{
  today: DailyUsage;
  thisMonth: MonthlyUsage;
  budgetStatus: Awaited<ReturnType<typeof checkBudgetAlert>>;
}> {
  const [today, thisMonth, budgetStatus] = await Promise.all([
    getDailyEnrichmentUsage(),
    getMonthlyEnrichmentUsage(),
    checkBudgetAlert(),
  ]);

  return { today, thisMonth, budgetStatus };
}
