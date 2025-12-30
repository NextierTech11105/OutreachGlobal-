/**
 * LUCI → SMS Queue Push Endpoint
 *
 * Connects LUCI (data lake) to the SMS queue system.
 * Used by Sectors page to push skip-traced leads to SMS campaigns.
 *
 * Flow:
 * 1. Sectors page selects leads with mobile phones
 * 2. DUPLICATE OUTREACH CHECK - Skip leads contacted in last 7 days
 * 3. This endpoint adds them to SMS queue (draft mode)
 * 4. User can preview/approve in Campaign Control
 * 5. Approved messages get sent via SignalHouse
 */

import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { and, eq, gt, inArray } from "drizzle-orm";

// Duplicate outreach prevention config (from FAILURE_PLAYBOOKS.md)
const DEDUP_WINDOW_DAYS = 7; // Don't contact same lead within 7 days

interface PhoneWithType {
  number: string;
  type?: string;
}

interface LeadForSms {
  id: string;
  name?: string;
  contactName?: string;
  companyName?: string;
  phone?: string;
  mobilePhone?: string;
  enrichedPhones?: PhoneWithType[];
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  industry?: string;
  // Additional context for personalization
  isDecisionMaker?: boolean;
  propertyLikelihood?: string;
}

interface PushToSmsRequest {
  leads: LeadForSms[];
  templateMessage: string;
  campaignId?: string;
  campaignName?: string;
  personality?: "professional" | "casual" | "friendly";
  priority?: number;
  // Options
  mode?: "draft" | "immediate"; // draft = human review, immediate = auto-send
  scheduledAt?: string;
  agent?: "gianna" | "sabrina";
  // Campaign context - drives message selection
  campaignContext?:
    | "initial"
    | "retarget"
    | "follow_up"
    | "nurture"
    | "instant"
    | "ghost";
  source?: string;
}

// Helper: Get best mobile phone from lead
function getBestMobilePhone(lead: LeadForSms): string | null {
  // Priority 1: Explicit mobile phone
  if (lead.mobilePhone) return lead.mobilePhone;

  // Priority 2: Mobile from enriched phones
  const mobile = lead.enrichedPhones?.find(
    (p) =>
      p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell",
  );
  if (mobile) return mobile.number;

  // Priority 3: Any enriched phone (may be mobile)
  if (lead.enrichedPhones?.length) {
    return lead.enrichedPhones[0].number;
  }

  // Fallback: Original phone field
  return lead.phone || null;
}

// Helper: Check if phone is known to be mobile
function isMobilePhone(lead: LeadForSms): boolean {
  if (lead.mobilePhone) return true;
  const mobile = lead.enrichedPhones?.find(
    (p) =>
      p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell",
  );
  return !!mobile;
}

// Helper: Build personalized message from template
function personalizeMessage(template: string, lead: LeadForSms): string {
  const name =
    lead.contactName?.split(" ")[0] || lead.name?.split(" ")[0] || "there";
  const company = lead.companyName || "your business";
  const city = lead.city || "your area";
  const industry = lead.industry || "your industry";

  return template
    .replace(/\{name\}/gi, name)
    .replace(/\{firstName\}/gi, name)
    .replace(/\{company\}/gi, company)
    .replace(/\{companyName\}/gi, company)
    .replace(/\{city\}/gi, city)
    .replace(/\{industry\}/gi, industry);
}

/**
 * DUPLICATE OUTREACH PREVENTION
 * Check if leads have been contacted within the dedup window
 * Returns set of lead IDs that should be skipped
 */
async function checkDuplicateOutreach(
  leadIds: string[],
): Promise<Map<string, { lastSentAt: Date; leadId: string }>> {
  if (!leadIds.length) return new Map();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DEDUP_WINDOW_DAYS);

  try {
    // Find leads with recent outbound messages
    const recentMessages = await db
      .select({
        leadId: messages.leadId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.leadId, leadIds),
          eq(messages.direction, "outbound"),
          gt(messages.createdAt, cutoffDate),
        ),
      );

    // Build map of leadId -> most recent sent date
    const duplicates = new Map<string, { lastSentAt: Date; leadId: string }>();
    for (const msg of recentMessages) {
      if (!msg.leadId) continue;
      const existing = duplicates.get(msg.leadId);
      if (!existing || (msg.createdAt && msg.createdAt > existing.lastSentAt)) {
        duplicates.set(msg.leadId, {
          leadId: msg.leadId,
          lastSentAt: msg.createdAt || new Date(),
        });
      }
    }

    return duplicates;
  } catch (error) {
    console.error("[Dedup Check] Error querying recent messages:", error);
    // On error, don't block - return empty (allow all)
    return new Map();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PushToSmsRequest = await request.json();
    const {
      leads,
      templateMessage,
      campaignId,
      campaignName,
      personality = "professional",
      priority = 5,
      mode = "draft",
      scheduledAt,
      agent = "gianna",
      campaignContext = "initial",
      source,
    } = body;

    // Validate
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { success: false, error: "leads array is required" },
        { status: 400 },
      );
    }

    if (!templateMessage || templateMessage.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "templateMessage is required" },
        { status: 400 },
      );
    }

    // Filter leads with valid phone numbers
    const leadsWithPhones = leads.filter((lead) => getBestMobilePhone(lead));

    if (leadsWithPhones.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No leads with valid phone numbers",
          totalLeads: leads.length,
        },
        { status: 400 },
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DUPLICATE OUTREACH PREVENTION (per FAILURE_PLAYBOOKS.md)
    // Skip leads contacted within the dedup window (7 days)
    // ═══════════════════════════════════════════════════════════════════════════
    const leadIds = leadsWithPhones.map((l) => l.id);
    const duplicates = await checkDuplicateOutreach(leadIds);

    // Separate duplicates from eligible leads
    const skippedDuplicates: Array<{
      leadId: string;
      reason: string;
      lastSentAt: Date;
    }> = [];
    const eligibleLeads = leadsWithPhones.filter((lead) => {
      const duplicate = duplicates.get(lead.id);
      if (duplicate) {
        skippedDuplicates.push({
          leadId: lead.id,
          reason: `recent_outreach_${DEDUP_WINDOW_DAYS}d`,
          lastSentAt: duplicate.lastSentAt,
        });
        return false;
      }
      return true;
    });

    if (skippedDuplicates.length > 0) {
      console.log(
        `[LUCI Push SMS] Skipped ${skippedDuplicates.length} leads due to recent outreach (${DEDUP_WINDOW_DAYS}-day window)`,
      );
    }

    if (eligibleLeads.length === 0) {
      return NextResponse.json({
        success: true,
        mode: mode,
        added: 0,
        skipped: leadsWithPhones.length,
        skippedDuplicates,
        message: `All ${leadsWithPhones.length} leads were contacted within the last ${DEDUP_WINDOW_DAYS} days`,
        stats: {
          totalLeads: leads.length,
          withPhones: leadsWithPhones.length,
          duplicatesSkipped: skippedDuplicates.length,
        },
      });
    }

    // Stats (using eligible leads after dedup)
    const mobileCount = eligibleLeads.filter((l) => isMobilePhone(l)).length;
    const landlineOrUnknown = eligibleLeads.length - mobileCount;

    console.log(
      `[LUCI Push SMS] Processing ${eligibleLeads.length} leads (${mobileCount} mobile, ${landlineOrUnknown} unknown type), skipped ${skippedDuplicates.length} duplicates`,
    );

    // Generate campaign ID if not provided
    const effectiveCampaignId =
      campaignId ||
      `luci-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Prepare leads for SMS queue (using eligible leads after dedup)
    const smsLeads = eligibleLeads.map((lead) => ({
      id: lead.id,
      name: lead.contactName || lead.name || lead.companyName || "Lead",
      phone: getBestMobilePhone(lead)!,
      email: lead.email,
      company: lead.companyName,
      address: lead.address,
      city: lead.city,
      state: lead.state,
    }));

    let result;

    if (mode === "draft") {
      // Add to draft queue for human review
      result = smsQueueService.addToDraftQueue(smsLeads, {
        templateCategory: `sms_${campaignContext}`, // initial, retarget, follow_up, etc.
        templateMessage,
        personality,
        campaignId: effectiveCampaignId,
        priority,
        agent,
        campaignContext, // Track the context for Gianna's message selection
        source,
      });

      console.log(
        `[LUCI Push SMS] Added ${result.added} leads to draft queue (context: ${campaignContext})`,
      );

      return NextResponse.json({
        success: true,
        mode: "draft",
        campaignId: effectiveCampaignId,
        campaignName:
          campaignName || `LUCI Campaign ${new Date().toLocaleDateString()}`,
        added: result.added,
        skipped: result.skipped,
        queueIds: result.queueIds,
        stats: {
          totalLeads: leads.length,
          withPhones: leadsWithPhones.length,
          eligibleAfterDedup: eligibleLeads.length,
          duplicatesSkipped: skippedDuplicates.length,
          mobilePhones: mobileCount,
          unknownType: landlineOrUnknown,
        },
        skippedDuplicates:
          skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
        nextStep:
          "Review messages at /campaigns/sms-queue or POST /api/sms/queue?action=approve_all",
      });
    } else {
      // Immediate mode - add directly to pending queue
      result = smsQueueService.addBatchToQueue(smsLeads, {
        templateCategory: `sms_${campaignContext}`,
        templateMessage,
        personality,
        campaignId: effectiveCampaignId,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        campaignContext,
        source,
      });

      console.log(
        `[LUCI Push SMS] Added ${result.added} leads to send queue (context: ${campaignContext})`,
      );

      return NextResponse.json({
        success: true,
        mode: "immediate",
        campaignId: effectiveCampaignId,
        campaignName:
          campaignName || `LUCI Campaign ${new Date().toLocaleDateString()}`,
        added: result.added,
        skipped: result.skipped,
        queueIds: result.queueIds,
        stats: {
          totalLeads: leads.length,
          withPhones: leadsWithPhones.length,
          eligibleAfterDedup: eligibleLeads.length,
          duplicatesSkipped: skippedDuplicates.length,
          mobilePhones: mobileCount,
          unknownType: landlineOrUnknown,
        },
        skippedDuplicates:
          skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
        nextStep: scheduledAt
          ? `Messages scheduled for ${scheduledAt}`
          : "Messages will be sent on next queue processing",
      });
    }
  } catch (error) {
    console.error("[LUCI Push SMS] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to push to SMS",
      },
      { status: 500 },
    );
  }
}

// GET - Check push status and queue info
export async function GET() {
  try {
    const stats = smsQueueService.getStats();
    const config = smsQueueService.getConfig();

    return NextResponse.json({
      success: true,
      endpoint: "POST /api/luci/push-to-sms",
      description: "Push skip-traced leads from LUCI/Sectors to SMS queue",
      queue: {
        pending: stats.pending,
        processing: stats.processing,
        sent: stats.sentToday,
        failed: stats.failed,
        dailyLimit: config.dailyLimit,
        remainingToday: stats.remainingToday,
      },
      usage: {
        requiredFields: ["leads", "templateMessage"],
        optionalFields: [
          "campaignId",
          "campaignName",
          "personality (professional|casual|friendly)",
          "priority (1-10)",
          "mode (draft|immediate)",
          "scheduledAt (ISO date)",
          "agent (gianna|sabrina)",
        ],
        templateVariables: [
          "{name} or {firstName}",
          "{company} or {companyName}",
          "{city}",
          "{industry}",
        ],
      },
      example: {
        leads: [
          {
            id: "lead_123",
            contactName: "John Smith",
            companyName: "ABC Plumbing",
            mobilePhone: "+15551234567",
            city: "Austin",
            state: "TX",
          },
        ],
        templateMessage:
          "Hey {name}! Quick question about {company} - are you looking for growth opportunities? Reply YES to chat.",
        mode: "draft",
        agent: "gianna",
      },
    });
  } catch (error) {
    console.error("[LUCI Push SMS] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get queue info" },
      { status: 500 },
    );
  }
}
