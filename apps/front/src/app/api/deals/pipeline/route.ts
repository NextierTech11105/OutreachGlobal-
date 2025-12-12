import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { Deal, DealStage, DealType, PipelineStats } from "../types";

// Pipeline stages in order
const PIPELINE_STAGES: DealStage[] = [
  "discovery",
  "qualification",
  "proposal",
  "negotiation",
  "contract",
  "closing",
];

interface PipelineColumn {
  stage: DealStage;
  name: string;
  deals: Deal[];
  count: number;
  value: number;
}

interface PipelineView {
  columns: PipelineColumn[];
  stats: PipelineStats;
  closedWon: Deal[];
  closedLost: Deal[];
}

// GET - Get pipeline board view
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const type = searchParams.get("type") as DealType | null;
    const assignedTo = searchParams.get("assignedTo");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    // Build conditions
    const conditions = [eq(deals.teamId, teamId)];

    if (type) {
      conditions.push(eq(deals.type, type));
    }
    if (assignedTo) {
      conditions.push(eq(deals.assignedTo, assignedTo));
    }
    if (dateFrom) {
      conditions.push(gte(deals.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(deals.createdAt, dateTo));
    }

    // Fetch all deals
    const allDeals = await db
      .select()
      .from(deals)
      .where(and(...conditions))
      .orderBy(desc(deals.updatedAt));

    // Build pipeline columns
    const columns: PipelineColumn[] = PIPELINE_STAGES.map((stage) => {
      const stageDeals = allDeals.filter((d) => d.stage === stage);
      const totalValue = stageDeals.reduce(
        (sum, d) => sum + (d.estimatedValue || 0),
        0,
      );

      return {
        stage,
        name: formatStageName(stage),
        deals: stageDeals,
        count: stageDeals.length,
        value: totalValue,
      };
    });

    // Get closed deals separately
    const closedWon = allDeals.filter((d) => d.stage === "closed_won");
    const closedLost = allDeals.filter((d) => d.stage === "closed_lost");

    // Calculate stats
    const activeDeals = allDeals.filter((d) =>
      PIPELINE_STAGES.includes(d.stage as DealStage),
    );

    const totalValue = activeDeals.reduce(
      (sum, d) => sum + (d.estimatedValue || 0),
      0,
    );

    const expectedRevenue = activeDeals.reduce(
      (sum, d) => sum + (d.monetization?.estimatedEarnings || 0),
      0,
    );

    const actualRevenue = closedWon.reduce(
      (sum, d) => sum + (d.monetization?.actualEarnings || 0),
      0,
    );

    const totalClosed = closedWon.length + closedLost.length;
    const conversionRate =
      totalClosed > 0 ? (closedWon.length / totalClosed) * 100 : 0;

    // Calculate average days in pipeline
    let totalDays = 0;
    for (const deal of activeDeals) {
      const created = new Date(deal.createdAt);
      const now = new Date();
      totalDays += Math.floor(
        (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    const avgDaysInPipeline =
      activeDeals.length > 0 ? Math.round(totalDays / activeDeals.length) : 0;

    // Build by-stage and by-type summaries
    const byStage: Record<string, { count: number; value: number }> = {};
    const byType: Record<string, { count: number; value: number }> = {};

    for (const deal of allDeals) {
      if (!byStage[deal.stage]) {
        byStage[deal.stage] = { count: 0, value: 0 };
      }
      byStage[deal.stage].count++;
      byStage[deal.stage].value += deal.estimatedValue || 0;

      if (!byType[deal.type]) {
        byType[deal.type] = { count: 0, value: 0 };
      }
      byType[deal.type].count++;
      byType[deal.type].value += deal.estimatedValue || 0;
    }

    const stats: PipelineStats = {
      totalDeals: activeDeals.length,
      totalValue,
      byStage: byStage as Record<DealStage, { count: number; value: number }>,
      byType: byType as Record<DealType, { count: number; value: number }>,
      avgDaysInPipeline,
      conversionRate: Math.round(conversionRate * 10) / 10,
      expectedRevenue,
    };

    const pipeline: PipelineView = {
      columns,
      stats,
      closedWon,
      closedLost,
    };

    return NextResponse.json({
      success: true,
      pipeline,
      summary: {
        activeDeals: activeDeals.length,
        totalValue: formatCurrency(totalValue),
        expectedRevenue: formatCurrency(expectedRevenue),
        actualRevenue: formatCurrency(actualRevenue),
        conversionRate: `${stats.conversionRate}%`,
        avgDaysInPipeline: `${avgDaysInPipeline} days`,
        closedWon: closedWon.length,
        closedLost: closedLost.length,
      },
    });
  } catch (error) {
    console.error("[Deals] Pipeline error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get pipeline",
      },
      { status: 500 },
    );
  }
}

// Helper: Format stage name for display
function formatStageName(stage: DealStage): string {
  const names: Record<DealStage, string> = {
    discovery: "Discovery",
    qualification: "Qualification",
    proposal: "Proposal",
    negotiation: "Negotiation",
    contract: "Contract",
    closing: "Closing",
    closed_won: "Won",
    closed_lost: "Lost",
  };
  return names[stage] || stage;
}

// Helper: Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
