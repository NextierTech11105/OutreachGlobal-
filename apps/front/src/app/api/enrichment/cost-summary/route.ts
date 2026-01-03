import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Enrichment Cost Summary API
 *
 * Aggregates costs from skip trace, Apollo, and NEVA research.
 * Returns monthly breakdown for billing and usage monitoring.
 *
 * GET /api/enrichment/cost-summary?teamId=xxx&months=3
 */

interface MonthlyCost {
  month: string;
  skipTrace: { count: number; credits: number; estimatedCost: number };
  apollo: { count: number; credits: number; estimatedCost: number };
  neva: { count: number; credits: number; estimatedCost: number };
  total: { count: number; credits: number; estimatedCost: number };
}

// Cost estimates per operation (in USD)
const COST_PER_SKIPTRACE = 0.15; // $0.10-0.25 average
const COST_PER_APOLLO = 0.05; // $0.05 per enrichment
const COST_PER_NEVA = 0.02; // $0.02 per Perplexity call

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const months = parseInt(searchParams.get("months") || "3", 10);

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Query skip trace costs
    const skipTraceQuery = await db.execute(sql`
      SELECT
        to_char(created_at, 'YYYY-MM') as month,
        COUNT(*) as count,
        COALESCE(SUM(credits_cost), 0) as credits
      FROM skiptrace_results
      WHERE team_id = ${teamId}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    // Query NEVA enrichments (no direct cost tracking yet)
    const nevaQuery = await db.execute(sql`
      SELECT
        to_char(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM neva_enrichments
      WHERE team_id = ${teamId}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    // Build monthly summary
    const monthlyMap = new Map<string, MonthlyCost>();

    // Process skip trace data
    for (const row of skipTraceQuery.rows as Array<{
      month: string;
      count: string;
      credits: string;
    }>) {
      const month = row.month;
      const count = parseInt(row.count, 10);
      const credits = parseFloat(row.credits) || count; // Use count if no credits tracked

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          month,
          skipTrace: { count: 0, credits: 0, estimatedCost: 0 },
          apollo: { count: 0, credits: 0, estimatedCost: 0 },
          neva: { count: 0, credits: 0, estimatedCost: 0 },
          total: { count: 0, credits: 0, estimatedCost: 0 },
        });
      }

      const entry = monthlyMap.get(month)!;
      entry.skipTrace.count = count;
      entry.skipTrace.credits = credits;
      entry.skipTrace.estimatedCost = count * COST_PER_SKIPTRACE;
    }

    // Process NEVA data
    for (const row of nevaQuery.rows as Array<{
      month: string;
      count: string;
    }>) {
      const month = row.month;
      const count = parseInt(row.count, 10);

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          month,
          skipTrace: { count: 0, credits: 0, estimatedCost: 0 },
          apollo: { count: 0, credits: 0, estimatedCost: 0 },
          neva: { count: 0, credits: 0, estimatedCost: 0 },
          total: { count: 0, credits: 0, estimatedCost: 0 },
        });
      }

      const entry = monthlyMap.get(month)!;
      entry.neva.count = count;
      entry.neva.credits = count; // 1 credit per call
      entry.neva.estimatedCost = count * COST_PER_NEVA;
    }

    // Calculate totals
    for (const entry of monthlyMap.values()) {
      entry.total.count =
        entry.skipTrace.count + entry.apollo.count + entry.neva.count;
      entry.total.credits =
        entry.skipTrace.credits + entry.apollo.credits + entry.neva.credits;
      entry.total.estimatedCost =
        entry.skipTrace.estimatedCost +
        entry.apollo.estimatedCost +
        entry.neva.estimatedCost;
    }

    // Sort by month descending
    const monthlyCosts = Array.from(monthlyMap.values()).sort((a, b) =>
      b.month.localeCompare(a.month),
    );

    // Calculate grand totals
    const grandTotal = {
      skipTrace: { count: 0, credits: 0, estimatedCost: 0 },
      apollo: { count: 0, credits: 0, estimatedCost: 0 },
      neva: { count: 0, credits: 0, estimatedCost: 0 },
      total: { count: 0, credits: 0, estimatedCost: 0 },
    };

    for (const entry of monthlyCosts) {
      grandTotal.skipTrace.count += entry.skipTrace.count;
      grandTotal.skipTrace.credits += entry.skipTrace.credits;
      grandTotal.skipTrace.estimatedCost += entry.skipTrace.estimatedCost;
      grandTotal.apollo.count += entry.apollo.count;
      grandTotal.apollo.credits += entry.apollo.credits;
      grandTotal.apollo.estimatedCost += entry.apollo.estimatedCost;
      grandTotal.neva.count += entry.neva.count;
      grandTotal.neva.credits += entry.neva.credits;
      grandTotal.neva.estimatedCost += entry.neva.estimatedCost;
      grandTotal.total.count += entry.total.count;
      grandTotal.total.credits += entry.total.credits;
      grandTotal.total.estimatedCost += entry.total.estimatedCost;
    }

    return NextResponse.json({
      teamId,
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        months,
      },
      monthly: monthlyCosts,
      total: grandTotal,
      rates: {
        skipTrace: COST_PER_SKIPTRACE,
        apollo: COST_PER_APOLLO,
        neva: COST_PER_NEVA,
      },
    });
  } catch (error) {
    console.error("[Cost Summary] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate cost summary",
      },
      { status: 500 },
    );
  }
}
