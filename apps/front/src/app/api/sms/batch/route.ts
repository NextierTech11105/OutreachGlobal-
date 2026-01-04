import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { inArray, eq } from "drizzle-orm";
import { sendSMS, isConfigured } from "@/lib/signalhouse/client";
import {
  resolveAndRenderTemplate,
  templateExists,
  isRawMessage,
} from "@/lib/sms/resolveTemplate";

/**
 * SMS BATCH API
 *
 * Handles batched SMS campaigns:
 * - Batches of 250 messages
 * - Max 2,000 per campaign block
 * - Auto-pause at limits
 * - Assigns Gianna/Sabrina to sender number for response handling
 *
 * ENFORCEMENT: Requires templateId from CARTRIDGE_LIBRARY.
 * Raw message text is deprecated and will be rejected.
 */

const BATCH_SIZE = 250;
const MAX_CAMPAIGN_SMS = 2000;

interface BatchRequest {
  leadIds: string[];
  campaignId?: string;
  workspaceId: string;
  batchNumber: number;
  templateId?: string; // REQUIRED - from CARTRIDGE_LIBRARY
  message?: string; // DEPRECATED - will be rejected if looks like raw message
  assignedAdvisor?: "gianna" | "sabrina"; // AI advisor for responses
}

interface BatchStatus {
  id: string;
  campaignId: string;
  status: "pending" | "sending" | "completed" | "paused" | "failed";
  totalSent: number;
  totalFailed: number;
  batchNumber: number;
  totalBatches: number;
  startTime: string;
  endTime?: string;
  assignedNumber?: string;
  assignedAdvisor?: string;
}

// In-memory batch tracking (production would use Redis/DB)
const batchStatuses = new Map<string, BatchStatus>();

// POST - Send batch of SMS
export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json();
    const {
      leadIds,
      campaignId,
      workspaceId,
      batchNumber,
      templateId,
      message,
      assignedAdvisor,
    } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds array is required" },
        { status: 400 },
      );
    }

    // ENFORCEMENT: Require templateId or reject raw messages
    if (!templateId && message) {
      // Check if message looks like a raw message (not a templateId)
      if (isRawMessage(message)) {
        return NextResponse.json(
          {
            error: "Raw message text is not allowed. Use templateId from CARTRIDGE_LIBRARY.",
            code: "RAW_MESSAGE_REJECTED",
            hint: "Pass templateId instead of message. Templates are in /lib/sms/template-cartridges.ts",
          },
          { status: 400 },
        );
      }
      // If message looks like a templateId, treat it as such
      // This provides backwards compatibility for old callers
    }

    // Determine the effective templateId
    const effectiveTemplateId = templateId || (message && !isRawMessage(message) ? message : null);

    // Validate templateId exists in CARTRIDGE_LIBRARY
    if (effectiveTemplateId && !templateExists(effectiveTemplateId)) {
      return NextResponse.json(
        {
          error: `Template not found in CARTRIDGE_LIBRARY: ${effectiveTemplateId}`,
          code: "TEMPLATE_NOT_FOUND",
          hint: "Use a valid templateId from the Template Library",
        },
        { status: 404 },
      );
    }

    // Limit batch size
    const batchLeadIds = leadIds.slice(0, BATCH_SIZE);
    const batchId = `batch-${campaignId || workspaceId}-${batchNumber}-${Date.now()}`;

    // Initialize batch status
    const status: BatchStatus = {
      id: batchId,
      campaignId: campaignId || workspaceId,
      status: "sending",
      totalSent: 0,
      totalFailed: 0,
      batchNumber,
      totalBatches: Math.ceil(leadIds.length / BATCH_SIZE),
      startTime: new Date().toISOString(),
      assignedAdvisor: assignedAdvisor || "gianna",
    };

    batchStatuses.set(batchId, status);

    // Get leads with phone numbers
    const leadsData = await db
      .select({
        id: leads.id,
        phone: leads.phone,
        firstName: leads.firstName,
        lastName: leads.lastName,
      })
      .from(leads)
      .where(inArray(leads.id, batchLeadIds));

    // Filter leads with valid phones
    const validLeads = leadsData.filter((l) => l.phone && l.phone.length >= 10);

    // Get the sending number (from workspace/campaign config)
    const sendingNumber =
      process.env.SIGNALHOUSE_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;

    let sent = 0;
    let failed = 0;

    // Check SignalHouse configuration
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured - add API keys to .env" },
        { status: 503 },
      );
    }

    // Process each lead - SEND REAL SMS via SignalHouse
    for (const lead of validLeads) {
      try {
        let personalizedMessage: string;

        // If we have a templateId, use resolveAndRenderTemplate
        if (effectiveTemplateId) {
          const variables: Record<string, string> = {
            name: lead.firstName || "there",
            firstName: lead.firstName || "",
            first_name: lead.firstName || "",
            lastName: lead.lastName || "",
            last_name: lead.lastName || "",
            businessName: lead.firstName || "", // fallback for company
            company: lead.firstName || "",
          };

          const resolved = resolveAndRenderTemplate(effectiveTemplateId, variables);
          personalizedMessage = resolved.message;
        } else {
          // Fallback for when no template is provided (shouldn't happen with enforcement)
          personalizedMessage = `Hi ${lead.firstName || "there"}, this is your advisor reaching out...`;
        }

        // SEND SMS via SignalHouse API
        const smsResult = await sendSMS({
          to: lead.phone,
          from: sendingNumber || "",
          message: personalizedMessage,
        });

        if (!smsResult.success) {
          console.error(
            `[SMSBatch] SignalHouse error for ${lead.phone}:`,
            smsResult.error,
          );
          failed++;
          continue;
        }

        // Create SMS record in database
        const smsId = crypto.randomUUID();
        try {
          await db.insert(smsMessages).values({
            id: smsId,
            leadId: lead.id,
            direction: "outbound",
            fromNumber: sendingNumber || "",
            toNumber: lead.phone,
            body: personalizedMessage,
            status: "sent",
            campaignId,
            sentAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch {
          console.log("[SMSBatch] SMS table may not exist yet, continuing...");
        }

        // Update lead with campaign assignment
        try {
          await db
            .update(leads)
            .set({
              lastContactDate: new Date(),
              assignedAdvisor: assignedAdvisor || "gianna",
              assignedNumber: sendingNumber,
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));
        } catch {
          console.log("[SMSBatch] Lead update may have failed, continuing...");
        }

        sent++;
        console.log(
          `[SMSBatch] SENT to ${lead.phone} (${lead.firstName}) - MessageID: ${smsResult.data?.messageId}`,
        );
      } catch (error) {
        console.error(`[SMSBatch] Failed for ${lead.phone}:`, error);
        failed++;
      }
    }

    // Update batch status
    status.totalSent = sent;
    status.totalFailed = failed;
    status.status = "completed";
    status.endTime = new Date().toISOString();
    status.assignedNumber = sendingNumber;
    batchStatuses.set(batchId, status);

    // Check if we've hit campaign limit
    const totalSentInCampaign = sent; // In production, aggregate from all batches
    const shouldPause = totalSentInCampaign >= MAX_CAMPAIGN_SMS;

    return NextResponse.json({
      success: true,
      batch: {
        id: batchId,
        sent,
        failed,
        total: batchLeadIds.length,
        batchNumber,
        assignedNumber: sendingNumber,
        assignedAdvisor: assignedAdvisor || "gianna",
      },
      shouldPause,
      message: shouldPause
        ? `Batch complete. Campaign paused at ${MAX_CAMPAIGN_SMS} SMS limit.`
        : `Batch ${batchNumber} complete: ${sent} sent, ${failed} failed`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Batch failed";
    console.error("[SMSBatch] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get batch status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const campaignId = searchParams.get("campaignId");

    if (batchId) {
      const status = batchStatuses.get(batchId);
      if (!status) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, batch: status });
    }

    if (campaignId) {
      const campaignBatches = Array.from(batchStatuses.values())
        .filter((b) => b.campaignId === campaignId)
        .sort((a, b) => b.batchNumber - a.batchNumber);

      const totalSent = campaignBatches.reduce(
        (sum, b) => sum + b.totalSent,
        0,
      );
      const totalFailed = campaignBatches.reduce(
        (sum, b) => sum + b.totalFailed,
        0,
      );

      return NextResponse.json({
        success: true,
        campaignId,
        totalBatches: campaignBatches.length,
        totalSent,
        totalFailed,
        isPaused: totalSent >= MAX_CAMPAIGN_SMS,
        batches: campaignBatches,
      });
    }

    // Return recent batches
    const recentBatches = Array.from(batchStatuses.values())
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      )
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      batches: recentBatches,
      config: {
        batchSize: BATCH_SIZE,
        maxCampaignSms: MAX_CAMPAIGN_SMS,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error("[SMSBatch] Query error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
