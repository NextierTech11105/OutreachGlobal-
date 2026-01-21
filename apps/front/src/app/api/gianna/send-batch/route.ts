import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendSMS } from "@/lib/signalhouse/client";
import { gianna } from "@/lib/gianna/gianna-service";
import { luciService } from "@/lib/luci";

/**
 * GIANNA SEND BATCH API
 *
 * Sends initial outreach messages to a batch of leads.
 * This is the entry point for the GIANNA → OUTBOUND SMS flow.
 *
 * Flow: Data Prep → Campaign Prep → OUTBOUND SMS (this) → Inbound Response → AI Copilot
 */

interface SendBatchRequest {
  leadIds: string[];
  teamId: string;
  fromNumber?: string; // Optional override for sending number
  templateOverride?: string; // Optional message template override
}

interface SendResult {
  leadId: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendBatchRequest = await request.json();
    const { leadIds, teamId, fromNumber, templateOverride } = body;

    if (!leadIds || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds is required" },
        { status: 400 },
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    // Get sending phone number (GIANNA's assigned number)
    let sendingNumber = fromNumber;
    if (!sendingNumber) {
      // Try to get GIANNA's assigned number from worker phone assignments
      try {
        const phoneRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/workers/phone?worker=gianna&teamId=${teamId}`,
        );
        const phoneData = await phoneRes.json();
        if (phoneData.success && phoneData.assignment?.phoneNumber) {
          sendingNumber = phoneData.assignment.phoneNumber;
        }
      } catch (e) {
        // Fall back to env var
        sendingNumber = process.env.GIANNA_PHONE_NUMBER;
      }
    }

    if (!sendingNumber) {
      return NextResponse.json(
        {
          error: "No sending number configured for GIANNA",
          hint: "Assign a phone number to GIANNA in SignalHouse settings",
        },
        { status: 400 },
      );
    }

    // Fetch leads from database
    const leadsData = await db
      .select()
      .from(leads)
      .where(inArray(leads.id, leadIds));

    if (leadsData.length === 0) {
      return NextResponse.json(
        { error: "No leads found with provided IDs" },
        { status: 404 },
      );
    }

    const results: SendResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process each lead
    for (const lead of leadsData) {
      // Skip if no phone number
      if (!lead.phone) {
        results.push({
          leadId: lead.id,
          success: false,
          error: "No phone number",
        });
        failCount++;
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // LUCI GATE - Compliance check BEFORE any send
      // ═══════════════════════════════════════════════════════════════════════════
      const luciCheck = await luciService.canContact(lead.id, teamId);
      if (!luciCheck.allowed) {
        console.log(`[GIANNA] LUCI blocked ${lead.id}: ${luciCheck.reason}`);
        results.push({
          leadId: lead.id,
          success: false,
          error: `LUCI blocked: ${luciCheck.reason}`,
        });
        failCount++;
        continue;
      }

      // Generate opener message using GIANNA service
      let message: string;

      if (templateOverride) {
        // Use template override if provided
        message = templateOverride
          .replace(/\{firstName\}/g, lead.firstName || "there")
          .replace(/\{lastName\}/g, lead.lastName || "")
          .replace(/\{companyName\}/g, lead.companyName || "your business")
          .replace(/\{address\}/g, lead.address || "your property");
      } else {
        // Use GIANNA's opener generation
        const openers = gianna.generateOpeners({
          context: {
            firstName: lead.firstName || undefined,
            lastName: lead.lastName || undefined,
            companyName: lead.companyName || undefined,
            propertyAddress: lead.address || undefined,
            phone: lead.phone,
            channel: "sms",
            stage: "cold_open",
            messageNumber: 1,
            teamId,
          },
          category: lead.companyName ? "business" : "property",
          count: 1,
        });

        message =
          openers[0] ||
          `Hi ${lead.firstName || "there"}, this is Emily from Homeowner Advisor. I wanted to reach out about your property. Do you have a moment to chat?`;
      }

      // Send SMS via SignalHouse
      try {
        const smsResult = await sendSMS({
          from: sendingNumber,
          to: lead.phone,
          message,
        });

        if (smsResult.success && smsResult.data) {
          results.push({
            leadId: lead.id,
            success: true,
            messageId: smsResult.data.messageId,
          });
          successCount++;

          // Update lead status
          const customFields =
            (lead.customFields as Record<string, unknown>) || {};
          await db
            .update(leads)
            .set({
              customFields: {
                ...customFields,
                giannaStatus: "sent",
                giannaLastSentAt: new Date().toISOString(),
                giannaMessageCount:
                  ((customFields.giannaMessageCount as number) || 0) + 1,
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));
        } else {
          results.push({
            leadId: lead.id,
            success: false,
            error: smsResult.error || "SMS send failed",
          });
          failCount++;
        }
      } catch (error) {
        results.push({
          leadId: lead.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failCount++;
      }

      // Rate limiting - small delay between sends
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `[GIANNA] Batch send complete: ${successCount} sent, ${failCount} failed`,
    );

    return NextResponse.json({
      success: true,
      summary: {
        total: leadIds.length,
        sent: successCount,
        failed: failCount,
      },
      results,
    });
  } catch (error) {
    console.error("[GIANNA] Send batch error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send batch",
      },
      { status: 500 },
    );
  }
}
