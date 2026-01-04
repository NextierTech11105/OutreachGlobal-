import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { inArray, eq } from "drizzle-orm";
import {
  executeBatchSMS,
  isRouterConfigured,
  type BatchExecutionRequest,
} from "@/lib/sms/ExecutionRouter";
import { templateExists, isRawMessage } from "@/lib/sms/resolveTemplate";

/**
 * SMS BATCH API
 *
 * Routes ALL batch sends through ExecutionRouter.
 * NO direct provider calls.
 *
 * - Batches of 250 messages
 * - Max 2,000 per campaign block
 * - Auto-pause at limits
 * - Assigns Gianna/Sabrina to sender number for response handling
 *
 * ENFORCEMENT: Requires templateId from CARTRIDGE_LIBRARY.
 * Raw message text is REJECTED.
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
  teamId?: string;
  trainingMode?: boolean;
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
  trainingMode?: boolean;
}

// In-memory batch tracking (production would use Redis/DB)
const batchStatuses = new Map<string, BatchStatus>();

// POST - Send batch of SMS via ExecutionRouter
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
      teamId,
      trainingMode,
    } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds array is required" },
        { status: 400 },
      );
    }

    // Check ExecutionRouter configuration
    const routerStatus = isRouterConfigured();
    if (!routerStatus.configured) {
      return NextResponse.json(
        { error: "SMS provider not configured" },
        { status: 503 },
      );
    }

    // ENFORCEMENT: Require templateId, reject raw messages
    if (!templateId && message) {
      if (isRawMessage(message)) {
        return NextResponse.json(
          {
            error:
              "Raw message text is not allowed. Use templateId from CARTRIDGE_LIBRARY.",
            code: "RAW_MESSAGE_REJECTED",
            hint: "Pass templateId instead of message",
          },
          { status: 400 },
        );
      }
    }

    // Determine the effective templateId
    const effectiveTemplateId =
      templateId || (message && !isRawMessage(message) ? message : null);

    // ENFORCEMENT: templateId is REQUIRED
    if (!effectiveTemplateId) {
      return NextResponse.json(
        {
          error: "templateId is required",
          code: "TEMPLATE_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    // Validate templateId exists in CARTRIDGE_LIBRARY
    if (!templateExists(effectiveTemplateId)) {
      return NextResponse.json(
        {
          error: `Template not found in CARTRIDGE_LIBRARY: ${effectiveTemplateId}`,
          code: "TEMPLATE_NOT_FOUND",
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
      trainingMode,
    };

    batchStatuses.set(batchId, status);

    // Get leads with phone numbers
    const leadsData = await db
      .select({
        id: leads.id,
        phone: leads.phone,
        firstName: leads.firstName,
        lastName: leads.lastName,
        company: leads.company,
      })
      .from(leads)
      .where(inArray(leads.id, batchLeadIds));

    // Filter leads with valid phones
    const validLeads = leadsData.filter((l) => l.phone && l.phone.length >= 10);

    // Get the sending number (from workspace/campaign config)
    const sendingNumber =
      process.env.SIGNALHOUSE_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;

    // Build recipients for ExecutionRouter batch
    const recipients: BatchExecutionRequest["recipients"] = validLeads.map(
      (lead) => ({
        to: lead.phone || "",
        variables: {
          name: lead.firstName || "there",
          firstName: lead.firstName || "",
          first_name: lead.firstName || "",
          lastName: lead.lastName || "",
          last_name: lead.lastName || "",
          businessName: lead.company || "",
          company: lead.company || "",
        },
        leadId: lead.id,
      }),
    );

    // ═══════════════════════════════════════════════════════════════════════
    // CANONICAL: Route through ExecutionRouter
    // This is the ONLY approved way to send batch SMS
    // ═══════════════════════════════════════════════════════════════════════
    const batchResult = await executeBatchSMS({
      templateId: effectiveTemplateId,
      recipients,
      teamId,
      campaignId,
      worker:
        (assignedAdvisor?.toUpperCase() as "GIANNA" | "SABRINA") || "GIANNA",
      trainingMode,
      batchSize: 50, // Internal batch size for rate limiting
      delayMs: 100, // Rate limiting delay
    });

    // Record SMS in database for successful sends
    for (const result of batchResult.results) {
      if (result.success) {
        const lead = validLeads.find((l) => l.phone === result.sentTo);
        if (lead) {
          const smsId = crypto.randomUUID();
          try {
            await db.insert(smsMessages).values({
              id: smsId,
              leadId: lead.id,
              direction: "outbound",
              fromNumber: result.sentFrom,
              toNumber: result.sentTo,
              body: result.renderedMessage,
              status: result.trainingMode ? "training" : "sent",
              campaignId,
              sentAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } catch {
            console.log(
              "[SMSBatch] SMS table may not exist yet, continuing...",
            );
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
            console.log(
              "[SMSBatch] Lead update may have failed, continuing...",
            );
          }
        }
      }
    }

    // Update batch status
    status.totalSent = batchResult.totalSent;
    status.totalFailed = batchResult.totalFailed;
    status.status = "completed";
    status.endTime = new Date().toISOString();
    status.assignedNumber = sendingNumber;
    batchStatuses.set(batchId, status);

    // Check if we've hit campaign limit
    const shouldPause = batchResult.totalSent >= MAX_CAMPAIGN_SMS;

    return NextResponse.json({
      success: true,
      batch: {
        id: batchId,
        sent: batchResult.totalSent,
        failed: batchResult.totalFailed,
        total: batchLeadIds.length,
        batchNumber,
        assignedNumber: sendingNumber,
        assignedAdvisor: assignedAdvisor || "gianna",
        trainingMode: batchResult.trainingMode,
      },
      shouldPause,
      message: shouldPause
        ? `Batch complete. Campaign paused at ${MAX_CAMPAIGN_SMS} SMS limit.`
        : `Batch ${batchNumber} complete: ${batchResult.totalSent} sent, ${batchResult.totalFailed} failed`,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Batch failed";
    console.error("[SMSBatch] Error:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
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
    const errorMsg = error instanceof Error ? error.message : "Query failed";
    console.error("[SMSBatch] Query error:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
