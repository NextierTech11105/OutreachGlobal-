import { NextRequest, NextResponse } from "next/server";
import {
  getDailyEnrichmentUsage,
  getMonthlyEnrichmentUsage,
  getOperationBreakdown,
  getEnrichmentCostSummary,
  checkBudgetAlert,
  formatCost,
  ENRICHMENT_COSTS,
} from "@/lib/services/enrichment-cost-tracker";

/**
 * GET /api/enrichment/costs
 *
 * Get enrichment cost and usage statistics.
 *
 * Query params:
 * - view: "summary" | "daily" | "monthly" | "breakdown" (default: summary)
 * - date: YYYY-MM-DD for daily, YYYY-MM for monthly
 * - budget: Monthly budget in dollars (for alert calculation)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "summary";
  const date = searchParams.get("date");
  const budgetDollars = parseInt(searchParams.get("budget") || "500", 10);

  try {
    switch (view) {
      case "summary": {
        const summary = await getEnrichmentCostSummary();
        return NextResponse.json({
          success: true,
          today: {
            ...summary.today,
            totalCostFormatted: formatCost(summary.today.totalCostCents),
          },
          thisMonth: {
            ...summary.thisMonth,
            totalCostFormatted: formatCost(summary.thisMonth.totalCostCents),
          },
          budget: {
            ...summary.budgetStatus,
            budgetFormatted: formatCost(summary.budgetStatus.budget),
            currentSpendFormatted: formatCost(
              summary.budgetStatus.currentSpend,
            ),
          },
        });
      }

      case "daily": {
        const targetDate = date || new Date().toISOString().split("T")[0];
        const [usage, breakdown] = await Promise.all([
          getDailyEnrichmentUsage(targetDate),
          getOperationBreakdown(targetDate),
        ]);
        return NextResponse.json({
          success: true,
          date: targetDate,
          usage: {
            ...usage,
            totalCostFormatted: formatCost(usage.totalCostCents),
            byCostFormatted: {
              skip_trace: formatCost(usage.byCost.skip_trace),
              apollo: formatCost(usage.byCost.apollo),
              neva: formatCost(usage.byCost.neva),
            },
          },
          breakdown,
        });
      }

      case "monthly": {
        const targetMonth = date || new Date().toISOString().substring(0, 7);
        const usage = await getMonthlyEnrichmentUsage(targetMonth);
        return NextResponse.json({
          success: true,
          month: targetMonth,
          usage: {
            ...usage,
            totalCostFormatted: formatCost(usage.totalCostCents),
            bySourceFormatted: {
              skip_trace: formatCost(usage.bySource.skip_trace.costCents),
              apollo: formatCost(usage.bySource.apollo.costCents),
              neva: formatCost(usage.bySource.neva.costCents),
            },
          },
        });
      }

      case "breakdown": {
        const targetDate = date || new Date().toISOString().split("T")[0];
        const breakdown = await getOperationBreakdown(targetDate);
        return NextResponse.json({
          success: true,
          date: targetDate,
          breakdown,
          costs: ENRICHMENT_COSTS,
        });
      }

      case "budget": {
        const budgetCents = budgetDollars * 100;
        const alert = await checkBudgetAlert(budgetCents);
        return NextResponse.json({
          success: true,
          alert: {
            ...alert,
            budgetFormatted: formatCost(alert.budget),
            currentSpendFormatted: formatCost(alert.currentSpend),
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Invalid view: ${view}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Enrichment Costs] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// GET endpoint info
export async function OPTIONS() {
  return NextResponse.json({
    endpoint: "GET /api/enrichment/costs",
    description: "Get enrichment cost and usage statistics",
    queryParams: {
      view: "summary | daily | monthly | breakdown | budget",
      date: "YYYY-MM-DD for daily, YYYY-MM for monthly",
      budget: "Monthly budget in dollars (default: 500)",
    },
    costs: ENRICHMENT_COSTS,
  });
}
