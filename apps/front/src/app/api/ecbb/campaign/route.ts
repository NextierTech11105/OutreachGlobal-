import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, inArray, isNotNull, sql } from "drizzle-orm";
import { sendSMS, getMyPhoneNumbers } from "@/lib/signalhouse/client";

/**
 * ECBB CAMPAIGN LAUNCHER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Takes qualified LeadIDs from the enrichment pipeline and launches SMS campaigns
 *
 * FLOW:
 *   1. Query leads with status="qualified" and tags contain "campaign_ready"
 *   2. Select opener template (Gianna/Sabrina)
 *   3. Queue SMS via SignalHouse API
 *   4. Track send status
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Opener templates by agent
const OPENER_TEMPLATES = {
  gianna: {
    business_owner: `Hi {firstName}! This is Gianna. I came across {companyName} and wanted to reach out - are you the owner? Looking to connect briefly about a potential opportunity.`,
    hvac_plumber: `Hi {firstName}! This is Gianna with a quick question - I noticed {companyName} has been in business for a while. Are you looking to expand or possibly explore other options for the business?`,
    general: `Hi {firstName}! This is Gianna. I found {companyName} online and wanted to reach out - are you still the owner? Would love to connect briefly.`,
  },
  sabrina: {
    follow_up: `Hi {firstName}, this is Sabrina following up. Did you have a chance to think about what we discussed? Would love to schedule a quick call.`,
    booking: `Hi {firstName}! Sabrina here. I have a few times open this week for a 15-min call about {companyName}. Would Tuesday or Thursday work better for you?`,
    value_prop: `{firstName} - Sabrina here. Quick question: if there was a way to increase the value of {companyName} by 20-30% before a potential sale, would that be worth a conversation?`,
  },
};

interface CampaignRequest {
  leadIds?: string[];
  tags?: string[];
  status?: string;
  limit?: number;
  agent?: "gianna" | "sabrina";
  template?: string;
  fromNumber?: string;
  dryRun?: boolean;
  teamId?: string;
}

interface CampaignResult {
  success: boolean;
  campaignId: string;
  stats: {
    leadsQueried: number;
    messagesQueued: number;
    messagesSent: number;
    messagesFailed: number;
  };
  fromNumber: string;
  agent: string;
  template: string;
  messages?: Array<{
    leadId: string;
    phone: string;
    status: string;
    messageId?: string;
    error?: string;
  }>;
}

function generateCampaignId(): string {
  return `camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function personalizeMessage(template: string, lead: any): string {
  return template
    .replace(/{firstName}/g, lead.firstName || "there")
    .replace(/{lastName}/g, lead.lastName || "")
    .replace(/{companyName}/g, lead.company || "your business")
    .replace(/{company}/g, lead.company || "your business");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CampaignRequest;
    const campaignId = generateCampaignId();

    const agent = body.agent || "gianna";
    const templateKey = body.template || "general";
    const template =
      OPENER_TEMPLATES[agent]?.[
        templateKey as keyof typeof OPENER_TEMPLATES.gianna
      ] || OPENER_TEMPLATES.gianna.general;

    console.log(`[ECBB Campaign] Starting campaign ${campaignId}`);

    const stats = {
      leadsQueried: 0,
      messagesQueued: 0,
      messagesSent: 0,
      messagesFailed: 0,
    };

    const messages: Array<{
      leadId: string;
      phone: string;
      status: string;
      messageId?: string;
      error?: string;
    }> = [];

    // Get from number
    let fromNumber = body.fromNumber;
    if (!fromNumber) {
      const numbersResult = await getMyPhoneNumbers();
      if (
        numbersResult.success &&
        numbersResult.data &&
        numbersResult.data.length > 0
      ) {
        fromNumber = numbersResult.data[0].phoneNumber;
      } else {
        return NextResponse.json(
          { success: false, error: "No SignalHouse phone numbers configured" },
          { status: 400 },
        );
      }
    }

    // Query qualified leads
    let query = db
      .select()
      .from(leads)
      .where(
        and(
          isNotNull(leads.phone),
          eq(leads.status, body.status || "qualified"),
          body.teamId ? eq(leads.teamId, body.teamId) : undefined,
        ),
      )
      .limit(body.limit || 100);

    // If specific lead IDs provided
    if (body.leadIds && body.leadIds.length > 0) {
      query = db
        .select()
        .from(leads)
        .where(inArray(leads.id, body.leadIds))
        .limit(body.limit || 100);
    }

    const qualifiedLeads = await query;
    stats.leadsQueried = qualifiedLeads.length;

    console.log(
      `[ECBB Campaign] Found ${qualifiedLeads.length} leads to message`,
    );

    // Send SMS to each lead
    for (const lead of qualifiedLeads) {
      if (!lead.phone) continue;

      const message = personalizeMessage(template, lead);
      stats.messagesQueued++;

      if (body.dryRun) {
        messages.push({
          leadId: lead.id,
          phone: lead.phone,
          status: "dry_run",
        });
        continue;
      }

      try {
        const result = await sendSMS({
          to: lead.phone,
          from: fromNumber,
          message,
        });

        if (result.success) {
          stats.messagesSent++;
          messages.push({
            leadId: lead.id,
            phone: lead.phone,
            status: "sent",
            messageId: result.data?.messageId,
          });

          // Update lead status
          await db
            .update(leads)
            .set({
              status: "contacted",
              tags: sql`array_append(COALESCE(tags, ARRAY[]::text[]), 'sms_sent')`,
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));
        } else {
          stats.messagesFailed++;
          messages.push({
            leadId: lead.id,
            phone: lead.phone,
            status: "failed",
            error: result.error,
          });
        }

        // Rate limit: 1 message per 200ms
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        stats.messagesFailed++;
        messages.push({
          leadId: lead.id,
          phone: lead.phone,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      campaignId,
      stats,
      fromNumber,
      agent,
      template: templateKey,
      messages: body.dryRun ? messages : undefined,
    } as CampaignResult);
  } catch (error) {
    console.error("[ECBB Campaign] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Campaign failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Get campaign-ready leads count
  if (action === "ready") {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(eq(leads.status, "qualified"), isNotNull(leads.phone)));

      return NextResponse.json({
        success: true,
        campaignReadyLeads: Number(result[0]?.count || 0),
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Failed to count leads" },
        { status: 500 },
      );
    }
  }

  // Get available templates
  if (action === "templates") {
    return NextResponse.json({
      success: true,
      templates: {
        gianna: Object.keys(OPENER_TEMPLATES.gianna),
        sabrina: Object.keys(OPENER_TEMPLATES.sabrina),
      },
    });
  }

  // Default: endpoint info
  return NextResponse.json({
    success: true,
    endpoint: "/api/ecbb/campaign",
    description: "Launch SMS campaigns for qualified ECBB leads",
    usage: {
      method: "POST",
      body: {
        leadIds: ["lead_xxx", "lead_yyy"],
        status: "qualified",
        limit: 100,
        agent: "gianna",
        template: "business_owner",
        dryRun: true,
      },
    },
    templates: {
      gianna: Object.keys(OPENER_TEMPLATES.gianna),
      sabrina: Object.keys(OPENER_TEMPLATES.sabrina),
    },
  });
}
