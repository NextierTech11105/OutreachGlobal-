import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNotNull, notInArray, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/signalhouse/client";
import { gianna } from "@/lib/gianna/gianna-service";
import {
  CAMPAIGN_MACROS,
  INSTANT_EXECUTION,
  MACRO_STABILIZATION_TARGET,
} from "@/config/constants";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INSTANT EXECUTE API - Zero Delay Campaign Execution
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PHILOSOPHY: Prep → Preview → Execute must be INSTANT
 * Every click = dopamine. Every send = progress toward 20K.
 *
 * Stage 1 Goal: Stabilize at 20K leads per campaign macro
 * - B2B Decision Makers: 20K
 * - Real Estate Technology: 20K
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const GIANNA_NUMBER = process.env.SIGNALHOUSE_FROM_NUMBER || "+15164079249";

interface InstantExecuteRequest {
  macro: "B2B" | "REAL_ESTATE_TECH";
  teamId: string;
  batchSize?: number;
  templateOverride?: string;
  dryRun?: boolean; // Preview only, don't send
}

interface ExecuteResult {
  leadId: string;
  phone: string;
  firstName?: string;
  message: string;
  status: "sent" | "failed" | "skipped";
  messageId?: string;
  error?: string;
}

// Excluded statuses - don't contact these
const EXCLUDED_STATUSES = ["opted_out", "dnc", "invalid", "bounced"];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: InstantExecuteRequest = await request.json();
    const { macro, teamId, batchSize, templateOverride, dryRun } = body;

    if (!macro || !CAMPAIGN_MACROS[macro]) {
      return NextResponse.json(
        { error: "Invalid macro. Use B2B or REAL_ESTATE_TECH" },
        { status: 400 },
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 },
      );
    }

    const macroConfig = CAMPAIGN_MACROS[macro];
    const execBatchSize = batchSize || INSTANT_EXECUTION.BATCH_SIZE;

    console.log(`[Instant Execute] 🚀 ${macro} - Batch: ${execBatchSize}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: PREP - Get enriched leads ready for outbound
    // ═══════════════════════════════════════════════════════════════════════════
    const prepStart = Date.now();

    // Get leads that:
    // 1. Have a phone number (enriched)
    // 2. Haven't been contacted by GIANNA yet
    // 3. Aren't opted out or DNC
    // 4. Match the macro's audience type
    const readyLeads = await db
      .select({
        id: leads.id,
        phone: leads.phone,
        firstName: leads.firstName,
        lastName: leads.lastName,
        companyName: leads.companyName,
        address: leads.address,
        customFields: leads.customFields,
      })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          isNotNull(leads.phone),
          notInArray(leads.status, EXCLUDED_STATUSES),
          // Not yet contacted by GIANNA
          sql`(custom_fields->>'giannaStatus' IS NULL OR custom_fields->>'giannaStatus' = '')`,
        ),
      )
      .limit(execBatchSize);

    const prepTime = Date.now() - prepStart;
    console.log(
      `[Instant Execute] 📋 PREP: ${readyLeads.length} leads in ${prepTime}ms`,
    );

    if (readyLeads.length === 0) {
      return NextResponse.json({
        success: true,
        macro,
        message: "No leads ready for outbound. Enrich more leads first.",
        stats: {
          prepared: 0,
          sent: 0,
          failed: 0,
          executionTime: Date.now() - startTime,
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: PREVIEW - Generate messages (instant, no delay)
    // ═══════════════════════════════════════════════════════════════════════════
    const previewStart = Date.now();
    const previews: ExecuteResult[] = [];

    for (const lead of readyLeads) {
      let message: string;

      if (templateOverride) {
        message = templateOverride
          .replace(/\{firstName\}/g, lead.firstName || "there")
          .replace(/\{lastName\}/g, lead.lastName || "")
          .replace(/\{companyName\}/g, lead.companyName || "your business")
          .replace(/\{address\}/g, lead.address || "your property");
      } else {
        const openers = gianna.generateOpeners({
          context: {
            firstName: lead.firstName || undefined,
            lastName: lead.lastName || undefined,
            companyName: lead.companyName || undefined,
            propertyAddress: lead.address || undefined,
            phone: lead.phone!,
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
          `Hi ${lead.firstName || "there"}, this is Emily from Homeowner Advisors. Quick question - are you open to a conversation about your property? Just reply YES or NO.`;
      }

      previews.push({
        leadId: lead.id,
        phone: lead.phone!,
        firstName: lead.firstName || undefined,
        message,
        status: "skipped", // Will be updated if we execute
      });
    }

    const previewTime = Date.now() - previewStart;
    console.log(
      `[Instant Execute] 👁️ PREVIEW: ${previews.length} messages in ${previewTime}ms`,
    );

    // If dry run, return preview only
    if (dryRun) {
      return NextResponse.json({
        success: true,
        macro,
        mode: "preview",
        stats: {
          prepared: readyLeads.length,
          previewed: previews.length,
          prepTime,
          previewTime,
          executionTime: Date.now() - startTime,
        },
        previews: previews.slice(0, 10), // Show first 10 for preview
        targetPool: MACRO_STABILIZATION_TARGET,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: EXECUTE - Send via SignalHouse (instant, parallel where possible)
    // ═══════════════════════════════════════════════════════════════════════════
    const executeStart = Date.now();
    const results: ExecuteResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Execute in parallel batches for speed
    const PARALLEL_BATCH = 10; // 10 concurrent sends

    for (let i = 0; i < previews.length; i += PARALLEL_BATCH) {
      const batch = previews.slice(i, i + PARALLEL_BATCH);

      const batchResults = await Promise.all(
        batch.map(async (preview) => {
          try {
            const smsResult = await sendSMS({
              from: GIANNA_NUMBER,
              to: preview.phone,
              message: preview.message,
            });

            if (smsResult.success && smsResult.data) {
              // Update lead status
              const lead = readyLeads.find((l) => l.id === preview.leadId);
              const customFields =
                (lead?.customFields as Record<string, unknown>) || {};

              await db
                .update(leads)
                .set({
                  customFields: {
                    ...customFields,
                    giannaStatus: "sent",
                    giannaLastSentAt: new Date().toISOString(),
                    giannaMessageCount:
                      ((customFields.giannaMessageCount as number) || 0) + 1,
                    campaignMacro: macro,
                  },
                  status: "contacted",
                  updatedAt: new Date(),
                })
                .where(eq(leads.id, preview.leadId));

              sentCount++;
              return {
                ...preview,
                status: "sent" as const,
                messageId: smsResult.data.messageId,
              };
            } else {
              failedCount++;
              return {
                ...preview,
                status: "failed" as const,
                error: smsResult.error || "Send failed",
              };
            }
          } catch (error) {
            failedCount++;
            return {
              ...preview,
              status: "failed" as const,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }),
      );

      results.push(...batchResults);

      // Minimal delay between batches to respect rate limits
      if (i + PARALLEL_BATCH < previews.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, INSTANT_EXECUTION.SEND_DELAY_MS),
        );
      }
    }

    const executeTime = Date.now() - executeStart;
    const totalTime = Date.now() - startTime;

    console.log(
      `[Instant Execute] ⚡ EXECUTE: ${sentCount} sent, ${failedCount} failed in ${executeTime}ms`,
    );
    console.log(
      `[Instant Execute] 🏁 TOTAL: ${totalTime}ms (prep: ${prepTime}ms, preview: ${previewTime}ms, execute: ${executeTime}ms)`,
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: RETURN RESULTS - Dopamine hit!
    // ═══════════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      macro,
      macroName: macroConfig.name,
      mode: "executed",
      stats: {
        prepared: readyLeads.length,
        sent: sentCount,
        failed: failedCount,
        successRate: Math.round((sentCount / readyLeads.length) * 100),
        prepTime,
        previewTime,
        executeTime,
        totalTime,
        msPerMessage: Math.round(executeTime / readyLeads.length),
      },
      // Progress toward 20K stabilization
      progress: {
        target: MACRO_STABILIZATION_TARGET,
        dailyTarget: macroConfig.dailyOutbound,
        thisBatch: sentCount,
        message: `${sentCount} messages sent! Keep pushing to 20K.`,
      },
      results: results.slice(0, 20), // First 20 for UI feedback
    });
  } catch (error) {
    console.error("[Instant Execute] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Execution failed",
      },
      { status: 500 },
    );
  }
}

// GET - Check macro status and readiness
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  try {
    // Get counts for each macro
    const stats = await Promise.all(
      Object.entries(CAMPAIGN_MACROS).map(async ([key, config]) => {
        // Count total enriched leads
        const enrichedResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.teamId, teamId),
              isNotNull(leads.phone),
              notInArray(leads.status, EXCLUDED_STATUSES),
            ),
          );

        // Count contacted leads
        const contactedResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.teamId, teamId),
              sql`custom_fields->>'giannaStatus' = 'sent'`,
              sql`custom_fields->>'campaignMacro' = ${config.id}`,
            ),
          );

        // Count ready (enriched but not contacted)
        const readyResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(
            and(
              eq(leads.teamId, teamId),
              isNotNull(leads.phone),
              notInArray(leads.status, EXCLUDED_STATUSES),
              sql`(custom_fields->>'giannaStatus' IS NULL OR custom_fields->>'giannaStatus' = '')`,
            ),
          );

        const enriched = Number(enrichedResult[0]?.count || 0);
        const contacted = Number(contactedResult[0]?.count || 0);
        const ready = Number(readyResult[0]?.count || 0);

        return {
          macro: key,
          name: config.name,
          target: MACRO_STABILIZATION_TARGET,
          enriched,
          contacted,
          ready,
          progress: Math.round((contacted / MACRO_STABILIZATION_TARGET) * 100),
          stabilized: contacted >= MACRO_STABILIZATION_TARGET,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      teamId,
      macros: stats,
      totalReady: stats.reduce((sum, s) => sum + s.ready, 0),
      totalContacted: stats.reduce((sum, s) => sum + s.contacted, 0),
      stage1Complete: stats.every((s) => s.stabilized),
    });
  } catch (error) {
    console.error("[Instant Execute] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get macro status" },
      { status: 500 },
    );
  }
}
