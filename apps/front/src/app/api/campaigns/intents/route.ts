/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CAMPAIGN INTENTS API - Purpose-Driven Campaign Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GET  /api/campaigns/intents - List all campaigns by intent
 * POST /api/campaigns/intents - Create lead groups for campaign
 *
 * Each campaign has:
 * - ID + Intent (what outcome we seek)
 * - Stage progression (COLD → WARM → HOT)
 * - Worker assignment (GIANNA → CATHY → SABRINA)
 * - All roads lead to: 15-MIN MEETING
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import {
  CAMPAIGNS,
  getCampaignByIntent,
  getCampaignByVertical,
  getStageForLead,
  shouldEscalate,
  getWorkerForCampaign,
  SCALE_TARGETS,
  type CampaignIntent,
  type LeadTemperature,
  type LeadGroup,
} from "@/config/campaign-intents";
import { Logger } from "@/lib/logger";

const log = new Logger("CampaignIntentsAPI");

// ═══════════════════════════════════════════════════════════════════════════════
// GET - List campaigns and lead groups by intent
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const intent = searchParams.get("intent") as CampaignIntent | null;
    const vertical = searchParams.get("vertical");
    const campaignId = searchParams.get("campaignId");

    // Get specific campaign
    if (campaignId) {
      const campaign = CAMPAIGNS[campaignId];
      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 },
        );
      }

      // Get lead counts by stage
      const leadCounts = await db
        .select({
          stage: sql<string>`custom_fields->>'stageId'`,
          temperature: sql<string>`custom_fields->>'temperature'`,
          count: sql<number>`count(*)`,
        })
        .from(leads)
        .where(sql`custom_fields->>'campaignId' = ${campaignId}`)
        .groupBy(
          sql`custom_fields->>'stageId'`,
          sql`custom_fields->>'temperature'`,
        );

      // Get outcome metrics
      const outcomes = await db
        .select({
          meetings: sql<number>`count(*) filter (where stage = 'appointment_set')`,
          qualified: sql<number>`count(*) filter (where stage = 'qualified')`,
          engaged: sql<number>`count(*) filter (where stage = 'engaged')`,
          contacted: sql<number>`count(*) filter (where stage = 'contacted')`,
        })
        .from(leads)
        .where(sql`custom_fields->>'campaignId' = ${campaignId}`);

      return NextResponse.json({
        success: true,
        campaign: {
          ...campaign,
          createdAt: campaign.createdAt.toISOString(),
        },
        leadGroups: leadCounts,
        outcomes: outcomes[0] || {
          meetings: 0,
          qualified: 0,
          engaged: 0,
          contacted: 0,
        },
        worker: getWorkerForCampaign(campaignId),
      });
    }

    // Filter by intent
    if (intent) {
      const campaigns = getCampaignByIntent(intent);
      return NextResponse.json({
        success: true,
        intent,
        campaigns: campaigns.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
        count: campaigns.length,
      });
    }

    // Filter by vertical
    if (vertical) {
      const campaigns = getCampaignByVertical(vertical);
      return NextResponse.json({
        success: true,
        vertical,
        campaigns: campaigns.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
        count: campaigns.length,
      });
    }

    // Return all campaigns with summary
    const allCampaigns = Object.values(CAMPAIGNS);

    // Get total lead counts per campaign
    const campaignLeadCounts = await db
      .select({
        campaignId: sql<string>`custom_fields->>'campaignId'`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(sql`custom_fields->>'campaignId' IS NOT NULL`)
      .groupBy(sql`custom_fields->>'campaignId'`);

    const leadCountMap = Object.fromEntries(
      campaignLeadCounts.map((c) => [c.campaignId, c.count]),
    );

    return NextResponse.json({
      success: true,
      campaigns: allCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        intent: c.intent,
        primaryOutcome: c.primaryOutcome,
        vertical: c.vertical,
        worker: c.worker,
        active: c.active,
        stageCount: c.stages.length,
        leadCount: leadCountMap[c.id] || 0,
      })),
      intents: [
        "DISCOVERY",
        "QUALIFICATION",
        "NURTURE",
        "REACTIVATION",
        "RETENTION",
        "REFERRAL",
      ],
      verticals: ["B2B", "REAL_ESTATE", "HOME_SERVICES", "TRUCKING", "ALL"],
      scaleTargets: SCALE_TARGETS,
      formula: {
        description: "Numbers Game → High-Impact Meetings",
        daily:
          "2000 SMS → 100 responses → 20 meetings → 10 qualified → 2 deals",
        weekly:
          "10K leads → 500 responses → 100 meetings → 50 qualified → 10 deals",
      },
    });
  } catch (error) {
    log.error("[CampaignIntents] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get campaign intents" },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Assign leads to campaign and create groups
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      campaignId,
      leadIds,
      batchId,
      temperature,
      classification,
    } = body as {
      action: "assign" | "escalate" | "group";
      campaignId: string;
      leadIds?: string[];
      batchId?: string;
      temperature?: LeadTemperature;
      classification?: string;
    };

    const campaign = CAMPAIGNS[campaignId];
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // ASSIGN leads to campaign
    if (action === "assign") {
      if (!leadIds && !batchId) {
        return NextResponse.json(
          { error: "leadIds or batchId required" },
          { status: 400 },
        );
      }

      const initialStage = campaign.stages[0];
      const initialTemperature: LeadTemperature = temperature || "COLD";

      let updateCount = 0;

      if (batchId) {
        // Assign all leads in batch
        const result = await db
          .update(leads)
          .set({
            customFields: sql`
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      COALESCE(custom_fields, '{}'::jsonb),
                      '{campaignId}',
                      ${JSON.stringify(campaignId)}::jsonb
                    ),
                    '{stageId}',
                    ${JSON.stringify(initialStage.id)}::jsonb
                  ),
                  '{temperature}',
                  ${JSON.stringify(initialTemperature)}::jsonb
                ),
                '{intent}',
                ${JSON.stringify(campaign.intent)}::jsonb
              )
            `,
            updatedAt: new Date(),
          })
          .where(sql`custom_fields->>'batchId' = ${batchId}`);

        updateCount = result.rowCount || 0;
      } else if (leadIds) {
        // Assign specific leads
        for (const leadId of leadIds) {
          await db
            .update(leads)
            .set({
              customFields: sql`
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      jsonb_set(
                        COALESCE(custom_fields, '{}'::jsonb),
                        '{campaignId}',
                        ${JSON.stringify(campaignId)}::jsonb
                      ),
                      '{stageId}',
                      ${JSON.stringify(initialStage.id)}::jsonb
                    ),
                    '{temperature}',
                    ${JSON.stringify(initialTemperature)}::jsonb
                  ),
                  '{intent}',
                  ${JSON.stringify(campaign.intent)}::jsonb
                )
              `,
              updatedAt: new Date(),
            })
            .where(eq(leads.id, leadId));
        }
        updateCount = leadIds.length;
      }

      return NextResponse.json({
        success: true,
        action: "assign",
        campaignId,
        campaignName: campaign.name,
        intent: campaign.intent,
        primaryOutcome: campaign.primaryOutcome,
        assignedLeads: updateCount,
        initialStage: {
          id: initialStage.id,
          name: initialStage.name,
          templateStage: initialStage.templateStage,
        },
        temperature: initialTemperature,
        worker: campaign.worker,
      });
    }

    // ESCALATE lead based on classification
    if (action === "escalate") {
      if (!leadIds || !classification) {
        return NextResponse.json(
          { error: "leadIds and classification required for escalate" },
          { status: 400 },
        );
      }

      const escalations: Array<{
        leadId: string;
        from: string;
        to: string;
        newTemperature: LeadTemperature;
      }> = [];

      for (const leadId of leadIds) {
        // Get current stage
        const lead = await db
          .select()
          .from(leads)
          .where(eq(leads.id, leadId))
          .limit(1);

        if (!lead[0]) continue;

        const customFields =
          (lead[0].customFields as Record<string, string>) || {};
        const currentStageId = customFields.stageId;
        const currentTemp =
          (customFields.temperature as LeadTemperature) || "COLD";

        // Check if should escalate
        const { escalate, nextStageId } = shouldEscalate(
          currentStageId,
          classification,
        );

        if (escalate && nextStageId) {
          // Escalate temperature
          const newTemp: LeadTemperature =
            currentTemp === "COLD"
              ? "WARM"
              : currentTemp === "WARM"
                ? "HOT"
                : "HOT";

          await db
            .update(leads)
            .set({
              customFields: sql`
                jsonb_set(
                  jsonb_set(
                    COALESCE(custom_fields, '{}'::jsonb),
                    '{stageId}',
                    ${JSON.stringify(nextStageId)}::jsonb
                  ),
                  '{temperature}',
                  ${JSON.stringify(newTemp)}::jsonb
                )
              `,
              status: newTemp === "HOT" ? "qualified" : "engaged",
              updatedAt: new Date(),
            })
            .where(eq(leads.id, leadId));

          escalations.push({
            leadId,
            from: currentStageId,
            to: nextStageId,
            newTemperature: newTemp,
          });
        }
      }

      return NextResponse.json({
        success: true,
        action: "escalate",
        campaignId,
        classification,
        escalations,
        escalatedCount: escalations.length,
        hotLeads: escalations.filter((e) => e.newTemperature === "HOT").length,
      });
    }

    // GROUP leads by stage + intent
    if (action === "group") {
      const groups = await db
        .select({
          stageId: sql<string>`custom_fields->>'stageId'`,
          temperature: sql<string>`custom_fields->>'temperature'`,
          intent: sql<string>`custom_fields->>'intent'`,
          count: sql<number>`count(*)`,
        })
        .from(leads)
        .where(sql`custom_fields->>'campaignId' = ${campaignId}`)
        .groupBy(
          sql`custom_fields->>'stageId'`,
          sql`custom_fields->>'temperature'`,
          sql`custom_fields->>'intent'`,
        );

      const leadGroups: LeadGroup[] = groups.map((g) => ({
        id: `${campaignId}_${g.stageId}_${g.temperature}`,
        campaignId,
        stageId: g.stageId,
        intent: g.intent as CampaignIntent,
        temperature: g.temperature as LeadTemperature,
        leadCount: g.count,
        outcomes: {
          meetings: 0,
          emails: 0,
          mobiles: 0,
          permissions: 0,
        },
      }));

      return NextResponse.json({
        success: true,
        action: "group",
        campaignId,
        campaignName: campaign.name,
        intent: campaign.intent,
        groups: leadGroups,
        totalGroups: leadGroups.length,
        totalLeads: leadGroups.reduce((sum, g) => sum + g.leadCount, 0),
        byTemperature: {
          cold: leadGroups
            .filter((g) => g.temperature === "COLD")
            .reduce((s, g) => s + g.leadCount, 0),
          warm: leadGroups
            .filter((g) => g.temperature === "WARM")
            .reduce((s, g) => s + g.leadCount, 0),
          hot: leadGroups
            .filter((g) => g.temperature === "HOT")
            .reduce((s, g) => s + g.leadCount, 0),
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'assign', 'escalate', or 'group'" },
      { status: 400 },
    );
  } catch (error) {
    log.error("[CampaignIntents] POST Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Campaign action failed",
      },
      { status: 500 },
    );
  }
}
