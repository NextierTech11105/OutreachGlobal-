import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  campaigns,
  campaignAttempts,
  callLogs,
  smsMessages,
} from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { apiAuth } from "@/lib/api-auth";

// GET - Fetch scheduled campaigns, calls, and sequences for the week view
export async function GET(request: NextRequest) {
  try {
    // Get auth context for team filtering
    let teamId: string | null = null;
    try {
      const auth = await apiAuth(request);
      if (auth) {
        teamId = auth.teamId;
      }
    } catch {
      // Continue without team filter
    }

    if (!db) {
      return NextResponse.json({
        campaigns: [],
        calls: [],
        sequences: [],
      });
    }

    // Get date range for next 7 days
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Fetch active/scheduled campaigns
    const campaignsData = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        startsAt: campaigns.startsAt,
        estimatedLeadsCount: campaigns.estimatedLeadsCount,
      })
      .from(campaigns)
      .where(
        and(
          teamId ? eq(campaigns.teamId, teamId) : undefined,
          gte(campaigns.startsAt, now),
          lte(campaigns.startsAt, weekEnd),
        ),
      )
      .orderBy(campaigns.startsAt)
      .limit(50);

    // Fetch scheduled campaign attempts (SMS sequences)
    const sequencesData = await db
      .select({
        id: campaignAttempts.id,
        campaignId: campaignAttempts.campaignId,
        campaignContext: campaignAttempts.campaignContext,
        status: campaignAttempts.status,
        scheduledAt: campaignAttempts.scheduledAt,
        channel: campaignAttempts.channel,
      })
      .from(campaignAttempts)
      .where(
        and(
          teamId ? eq(campaignAttempts.teamId, teamId) : undefined,
          eq(campaignAttempts.status, "pending"),
          gte(campaignAttempts.scheduledAt, now),
          lte(campaignAttempts.scheduledAt, weekEnd),
        ),
      )
      .orderBy(campaignAttempts.scheduledAt)
      .limit(100);

    // Fetch scheduled/recent calls
    const callsData = await db
      .select({
        id: callLogs.id,
        direction: callLogs.direction,
        fromNumber: callLogs.fromNumber,
        toNumber: callLogs.toNumber,
        status: callLogs.status,
        startedAt: callLogs.startedAt,
        leadId: callLogs.leadId,
      })
      .from(callLogs)
      .where(
        and(gte(callLogs.createdAt, now), lte(callLogs.createdAt, weekEnd)),
      )
      .orderBy(desc(callLogs.createdAt))
      .limit(50);

    // Transform data for frontend
    const transformedCampaigns = campaignsData.map((c) => ({
      id: c.id,
      name: c.name,
      scheduledAt: c.startsAt?.toISOString() || new Date().toISOString(),
      recipientCount: c.estimatedLeadsCount || 0,
      status:
        c.status === "ACTIVE"
          ? "active"
          : c.status === "COMPLETED"
            ? "completed"
            : "pending",
    }));

    const transformedCalls = callsData.map((c) => ({
      id: c.id,
      scheduledAt: c.startedAt?.toISOString() || new Date().toISOString(),
      leadName: `Call ${c.direction === "inbound" ? "from" : "to"} ${c.direction === "inbound" ? c.fromNumber : c.toNumber}`,
      status:
        c.status === "completed"
          ? "completed"
          : c.status === "in-progress"
            ? "active"
            : "pending",
    }));

    // Group sequences by campaign context
    const sequenceGroups = new Map<string, typeof sequencesData>();
    for (const seq of sequencesData) {
      const key = seq.campaignContext || seq.campaignId || "general";
      if (!sequenceGroups.has(key)) {
        sequenceGroups.set(key, []);
      }
      sequenceGroups.get(key)!.push(seq);
    }

    const transformedSequences = Array.from(sequenceGroups.entries()).map(
      ([context, items]) => ({
        id: items[0].id,
        name: `${context} Sequence`,
        scheduledAt:
          items[0].scheduledAt?.toISOString() || new Date().toISOString(),
        recipientCount: items.length,
        status: "pending" as const,
      }),
    );

    return NextResponse.json({
      campaigns: transformedCampaigns,
      calls: transformedCalls,
      sequences: transformedSequences,
    });
  } catch (error) {
    console.error("[Outreach Schedule API] Error:", error);
    return NextResponse.json({
      campaigns: [],
      calls: [],
      sequences: [],
      error:
        error instanceof Error ? error.message : "Failed to fetch schedule",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // TODO: Create scheduled campaign or sequence
    // This would insert into campaignAttempts with scheduledAt

    return NextResponse.json({ success: true, id: "schedule_" + Date.now() });
  } catch {
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 400 },
    );
  }
}
