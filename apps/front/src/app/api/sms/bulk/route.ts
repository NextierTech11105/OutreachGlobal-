/**
 * Bulk SMS API - Send up to 2,000 messages at once
 * Uses SignalHouse integration with LUCI guardrails
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { sendSMS, isConfigured } from "@/lib/signalhouse";
import { db } from "@/lib/db";
import { smsMessages, leads } from "@/lib/db/schema";
import { eq, and, or, sql, inArray, not, isNotNull } from "drizzle-orm";

const MAX_BULK_LIMIT = 2000;
const BATCH_SIZE = 50; // Process in batches to avoid timeouts

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "SignalHouse not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      message,
      source,
      limit = 100,
      fromNumber,
      label,
      scheduledAt,
      pushToHotQueue,
      webhookUrl,
    } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const effectiveLimit = Math.min(limit, MAX_BULK_LIMIT);

    // Build query based on source
    let whereConditions = [
      eq(leads.teamId, teamId),
      isNotNull(leads.phone),
      not(eq(leads.status, "opted_out")),
    ];

    // Add source-specific filters
    switch (source) {
      case "responded":
        // GREEN tag - leads who responded
        whereConditions.push(sql`'responded' = ANY(tags)`);
        break;
      case "gold":
        // GOLD label - email + mobile captured
        whereConditions.push(sql`'gold_label' = ANY(tags)`);
        break;
      case "hot":
        whereConditions.push(eq(leads.status, "hot_lead"));
        break;
      case "warm":
        whereConditions.push(
          or(eq(leads.status, "warm"), eq(leads.status, "interested"))!
        );
        break;
      case "all":
        // All active leads with phone
        break;
      default:
        break;
    }

    // Fetch leads
    const targetLeads = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        phone: leads.phone,
        company: leads.company,
      })
      .from(leads)
      .where(and(...whereConditions))
      .limit(effectiveLimit);

    if (targetLeads.length === 0) {
      return NextResponse.json(
        { error: "No eligible leads found", sent: 0, failed: 0, total: 0 },
        { status: 400 }
      );
    }

    // Get from number
    const from =
      fromNumber ||
      process.env.SIGNALHOUSE_FROM_NUMBER ||
      process.env.GIANNA_PHONE_NUMBER ||
      "";

    if (!from) {
      return NextResponse.json(
        { error: "No from number configured" },
        { status: 400 }
      );
    }

    // Handle scheduled sends - queue for later instead of sending now
    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt);
      if (scheduledTime < new Date()) {
        return NextResponse.json(
          { error: "Scheduled time must be in the future" },
          { status: 400 }
        );
      }

      // Queue all messages for scheduled delivery
      const queuedMessages = await Promise.all(
        targetLeads.map(async (lead) => {
          const personalizedMessage = message
            .replace(/{firstName}/gi, lead.firstName || "")
            .replace(/{lastName}/gi, lead.lastName || "")
            .replace(/{company}/gi, lead.company || "")
            .replace(/{phone}/gi, lead.phone || "")
            .trim();

          return db.insert(smsMessages).values({
            leadId: lead.id,
            userId,
            direction: "outbound",
            fromNumber: from,
            toNumber: lead.phone!,
            body: personalizedMessage,
            status: "scheduled",
            provider: "signalhouse",
            scheduledFor: scheduledTime,
            sentAt: null,
            metadata: {
              bulk: true,
              source,
              label: label || "initial",
              pushToHotQueue,
              webhookUrl,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        })
      );

      console.log(
        `[Bulk SMS] Scheduled ${targetLeads.length} messages for ${scheduledTime.toISOString()} by ${userId}`
      );

      return NextResponse.json({
        success: true,
        total: targetLeads.length,
        queued: targetLeads.length,
        scheduledFor: scheduledAt,
        label,
        source,
      });
    }

    // Process in batches (immediate send)
    let sent = 0;
    let failed = 0;
    let hotLeadsCreated = 0;
    const results: { leadId: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < targetLeads.length; i += BATCH_SIZE) {
      const batch = targetLeads.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (lead) => {
          // Variable substitution
          const personalizedMessage = message
            .replace(/{firstName}/gi, lead.firstName || "")
            .replace(/{lastName}/gi, lead.lastName || "")
            .replace(/{company}/gi, lead.company || "")
            .replace(/{phone}/gi, lead.phone || "")
            .trim();

          try {
            const result = await sendSMS({
              to: lead.phone!,
              from,
              message: personalizedMessage,
            });

            // Save to database
            await db.insert(smsMessages).values({
              leadId: lead.id,
              userId,
              direction: "outbound",
              fromNumber: from,
              toNumber: lead.phone!,
              body: personalizedMessage,
              status: result.success ? "sent" : "failed",
              provider: "signalhouse",
              providerMessageId: result.data?.messageId || null,
              sentAt: result.success ? new Date() : null,
              errorMessage: result.error || null,
              metadata: {
                bulk: true,
                source,
                label: label || "initial",
                pushToHotQueue,
                webhookUrl,
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Push to hot lead queue if enabled and send successful
            if (result.success && pushToHotQueue) {
              await db
                .update(leads)
                .set({
                  status: "hot_lead",
                  updatedAt: new Date(),
                })
                .where(eq(leads.id, lead.id));
            }

            return { leadId: lead.id, success: result.success, error: result.error };
          } catch (error) {
            return {
              leadId: lead.id,
              success: false,
              error: error instanceof Error ? error.message : "Send failed",
            };
          }
        })
      );

      // Count results
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            sent++;
            if (pushToHotQueue) {
              hotLeadsCreated++;
            }
          } else {
            failed++;
          }
          results.push(result.value);
        } else {
          failed++;
          results.push({
            leadId: "unknown",
            success: false,
            error: result.reason?.message || "Unknown error",
          });
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < targetLeads.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `[Bulk SMS] Sent ${sent}/${targetLeads.length} messages (${failed} failed) by ${userId}` +
        (hotLeadsCreated > 0 ? ` - ${hotLeadsCreated} hot leads created` : "")
    );

    return NextResponse.json({
      success: true,
      total: targetLeads.length,
      sent,
      failed,
      source,
      label: label || "initial",
      hotLeadsCreated: pushToHotQueue ? hotLeadsCreated : 0,
      webhookConfigured: !!webhookUrl,
      results: results.slice(0, 10), // Return first 10 results for debugging
    });
  } catch (error) {
    console.error("[Bulk SMS] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk send failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: "POST /api/sms/bulk",
    description: "Send bulk SMS to leads (up to 2,000)",
    params: {
      message: "SMS message with variables: {firstName}, {lastName}, {company}, {phone}",
      source: "Lead source: responded, gold, hot, warm, all",
      limit: "Max recipients (default 100, max 2000)",
      fromNumber: "From number (optional, uses default)",
    },
    limits: {
      maxBulk: MAX_BULK_LIMIT,
      signalHouseDaily: 2000,
    },
  });
}
