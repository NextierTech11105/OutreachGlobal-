import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals, leads } from "@/lib/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  Deal,
  CreateDealInput,
  DealStage,
  DEFAULT_MONETIZATION,
  PipelineStats,
} from "./types";

// GET - List deals with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const stage = searchParams.get("stage") as DealStage | null;
    const type = searchParams.get("type");
    const assignedTo = searchParams.get("assignedTo");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeStats = searchParams.get("stats") === "true";

    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    // Build conditions
    const conditions = [eq(deals.teamId, teamId)];

    if (stage) {
      conditions.push(eq(deals.stage, stage));
    }
    if (type) {
      conditions.push(eq(deals.type, type));
    }
    if (assignedTo) {
      conditions.push(eq(deals.assignedTo, assignedTo));
    }
    if (priority) {
      conditions.push(eq(deals.priority, priority));
    }

    // Exclude closed deals from main list unless specifically requested
    if (!stage) {
      conditions.push(
        sql`${deals.stage} NOT IN ('closed_won', 'closed_lost')`
      );
    }

    // Fetch deals
    const dealsList = await db
      .select()
      .from(deals)
      .where(and(...conditions))
      .orderBy(desc(deals.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Optionally include pipeline stats
    let stats: PipelineStats | undefined;
    if (includeStats) {
      stats = await getPipelineStats(teamId);
    }

    return NextResponse.json({
      success: true,
      deals: dealsList,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + dealsList.length < total,
      },
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error("[Deals] List error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list deals" },
      { status: 500 }
    );
  }
}

// POST - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const body: CreateDealInput & { teamId: string; userId: string } = await request.json();
    const {
      leadId,
      teamId,
      userId,
      type,
      name,
      description,
      estimatedValue,
      priority = "standard",
      monetization,
      expectedCloseDate,
      tags = [],
    } = body;

    if (!leadId || !teamId || !type || !name || !estimatedValue) {
      return NextResponse.json(
        { error: "leadId, teamId, type, name, and estimatedValue are required" },
        { status: 400 }
      );
    }

    // Get lead data to populate deal
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead.length) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const leadData = lead[0];

    // Determine monetization
    const dealMonetization = monetization || DEFAULT_MONETIZATION[type];
    const estimatedEarnings = (estimatedValue * dealMonetization.rate) / 100;

    const dealId = uuidv4();
    const now = new Date().toISOString();

    // Build property data from lead if available
    const propertyData = leadData.propertyAddress
      ? {
          id: leadData.propertyId || "",
          address: leadData.propertyAddress,
          type: leadData.propertyType || "unknown",
          avm: leadData.estimatedValue || 0,
          equity: leadData.estimatedEquity || 0,
          sqft: leadData.sqft,
          bedrooms: leadData.bedrooms,
          bathrooms: leadData.bathrooms,
        }
      : undefined;

    // Build business data from lead if available
    const businessData = leadData.companyName
      ? {
          id: leadData.apolloOrgId || "",
          name: leadData.companyName,
          industry: leadData.industry || leadData.apolloIndustry || "unknown",
          revenue: leadData.apolloRevenue || 0,
          employees: leadData.apolloEmployeeCount || 0,
        }
      : undefined;

    // Build seller from lead
    const seller = {
      name: `${leadData.firstName || ""} ${leadData.lastName || ""}`.trim() || "Unknown",
      email: leadData.email,
      phone: leadData.phone,
      role: "seller" as const,
      company: leadData.companyName,
    };

    const newDeal: Deal = {
      id: dealId,
      leadId,
      teamId,
      assignedTo: userId,
      type,
      stage: "discovery",
      priority,
      name,
      description,
      estimatedValue,
      monetization: {
        type: dealMonetization.type,
        rate: dealMonetization.rate,
        estimatedEarnings,
      },
      property: propertyData,
      business: businessData,
      seller,
      createdAt: now,
      updatedAt: now,
      expectedCloseDate,
      tags,
    };

    // Insert deal
    await db.insert(deals).values(newDeal);

    // Update lead status to indicate deal created
    await db
      .update(leads)
      .set({
        status: "deal_created",
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    return NextResponse.json({
      success: true,
      deal: newDeal,
      message: "Deal created successfully",
    });
  } catch (error) {
    console.error("[Deals] Create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create deal" },
      { status: 500 }
    );
  }
}

// Helper: Get pipeline statistics
async function getPipelineStats(teamId: string): Promise<PipelineStats> {
  const allDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.teamId, teamId));

  const activeStages: DealStage[] = [
    "discovery",
    "qualification",
    "proposal",
    "negotiation",
    "contract",
    "closing",
  ];

  const byStage: Record<string, { count: number; value: number }> = {};
  const byType: Record<string, { count: number; value: number }> = {};

  let totalValue = 0;
  let totalDays = 0;
  let closedWon = 0;
  let closedLost = 0;
  let expectedRevenue = 0;

  for (const deal of allDeals) {
    // By stage
    if (!byStage[deal.stage]) {
      byStage[deal.stage] = { count: 0, value: 0 };
    }
    byStage[deal.stage].count++;
    byStage[deal.stage].value += deal.estimatedValue || 0;

    // By type
    if (!byType[deal.type]) {
      byType[deal.type] = { count: 0, value: 0 };
    }
    byType[deal.type].count++;
    byType[deal.type].value += deal.estimatedValue || 0;

    // Total value (active only)
    if (activeStages.includes(deal.stage as DealStage)) {
      totalValue += deal.estimatedValue || 0;
      expectedRevenue += deal.monetization?.estimatedEarnings || 0;
    }

    // Conversion tracking
    if (deal.stage === "closed_won") closedWon++;
    if (deal.stage === "closed_lost") closedLost++;

    // Days in pipeline
    const created = new Date(deal.createdAt);
    const updated = new Date(deal.updatedAt);
    totalDays += Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  const totalClosed = closedWon + closedLost;
  const conversionRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;
  const avgDaysInPipeline = allDeals.length > 0 ? totalDays / allDeals.length : 0;

  return {
    totalDeals: allDeals.filter((d) => activeStages.includes(d.stage as DealStage)).length,
    totalValue,
    byStage: byStage as Record<DealStage, { count: number; value: number }>,
    byType: byType as Record<string, { count: number; value: number }>,
    avgDaysInPipeline: Math.round(avgDaysInPipeline),
    conversionRate: Math.round(conversionRate * 10) / 10,
    expectedRevenue,
  };
}
