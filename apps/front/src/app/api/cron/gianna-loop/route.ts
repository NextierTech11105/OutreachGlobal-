/**
 * GIANNA Loop Auto-Processing Cron
 *
 * Runs THE LOOP cadence engine to process leads through the 30-day sequence.
 * Called hourly by DigitalOcean App Platform cron job.
 *
 * THE LOOP touches:
 * - Days 1-5: GIANNA (cold opener, nudges, value messages)
 * - Days 7-10: CATHY (humor-driven nurture)
 * - Days 14-30: SABRINA (closing attempts, calls, final pushes)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, campaignLeads, campaigns } from "@/lib/db/schema";
import { eq, and, lte, isNotNull, inArray } from "drizzle-orm";
import { smsQueueService } from "@/lib/services/sms-queue-service";

// Simple auth check for cron endpoint
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.log("[GIANNA Cron] Warning: CRON_SECRET not set, allowing request");
    return true;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") === cronSecret) {
    return true;
  }

  return false;
}

// Determine which worker handles the lead based on day in sequence
function getWorkerForDay(dayInSequence: number): "gianna" | "cathy" | "sabrina" {
  if (dayInSequence <= 5) return "gianna";
  if (dayInSequence <= 10) return "cathy";
  return "sabrina";
}

// THE LOOP touch schedule
const TOUCH_DAYS = [1, 3, 5, 7, 10, 14, 21, 28, 30];

export async function POST(request: NextRequest) {
  if (!validateCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();
    const now = new Date();

    console.log("[GIANNA Cron] Starting loop processing at", now.toISOString());

    // Check if database is available
    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Database not available",
      }, { status: 503 });
    }

    // Find leads enrolled in active campaigns that need processing
    // A lead needs processing if:
    // 1. They're in an active campaign
    // 2. Their nextSequenceRunAt is <= now
    // 3. They haven't completed the sequence
    const leadsToProcess = await db
      .select({
        leadId: campaignLeads.leadId,
        campaignId: campaignLeads.campaignId,
        position: campaignLeads.position,
        enrolledAt: campaignLeads.enrolledAt,
        phone: leads.phone,
        firstName: leads.firstName,
        lastName: leads.lastName,
        companyName: leads.company,
        status: leads.status,
      })
      .from(campaignLeads)
      .innerJoin(leads, eq(leads.id, campaignLeads.leadId))
      .innerJoin(campaigns, eq(campaigns.id, campaignLeads.campaignId))
      .where(
        and(
          eq(campaigns.status, "active"),
          lte(campaignLeads.nextSequenceRunAt, now),
          isNotNull(leads.phone)
        )
      )
      .limit(100); // Process 100 leads per run

    if (leadsToProcess.length === 0) {
      console.log("[GIANNA Cron] No leads to process");
      return NextResponse.json({
        success: true,
        action: "no_work",
        message: "No leads ready for processing",
        duration: Date.now() - startTime,
      });
    }

    console.log(`[GIANNA Cron] Processing ${leadsToProcess.length} leads`);

    let processed = 0;
    let skipped = 0;
    let queued = 0;

    for (const lead of leadsToProcess) {
      // Skip if opted out or invalid status
      if (lead.status === "opted_out" || lead.status === "do_not_contact") {
        skipped++;
        continue;
      }

      // Calculate day in sequence
      const enrolledAt = lead.enrolledAt ? new Date(lead.enrolledAt) : now;
      const dayInSequence = Math.floor(
        (now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      // Check if this is a touch day
      if (!TOUCH_DAYS.includes(dayInSequence)) {
        // Not a touch day, skip but update next run time
        const nextTouchDay = TOUCH_DAYS.find(d => d > dayInSequence);
        if (nextTouchDay) {
          const nextRunAt = new Date(enrolledAt);
          nextRunAt.setDate(nextRunAt.getDate() + nextTouchDay - 1);

          // Update nextSequenceRunAt in database
          await db
            .update(campaignLeads)
            .set({ nextSequenceRunAt: nextRunAt })
            .where(
              and(
                eq(campaignLeads.leadId, lead.leadId),
                eq(campaignLeads.campaignId, lead.campaignId)
              )
            );
        }
        skipped++;
        continue;
      }

      // Determine worker based on day
      const worker = getWorkerForDay(dayInSequence);

      // Add to SMS queue as draft (for human review)
      const result = smsQueueService.addColdSMSToQueue(
        {
          leadId: lead.leadId,
          phone: lead.phone!,
          firstName: lead.firstName || "there",
          businessName: lead.companyName || "",
          touchNumber: dayInSequence,
        },
        {
          campaignId: lead.campaignId,
          priority: worker === "sabrina" ? 8 : worker === "cathy" ? 6 : 5,
        }
      );

      if (result) {
        queued++;

        // Calculate next touch day
        const nextTouchDay = TOUCH_DAYS.find(d => d > dayInSequence);
        if (nextTouchDay) {
          const nextRunAt = new Date(enrolledAt);
          nextRunAt.setDate(nextRunAt.getDate() + nextTouchDay - 1);

          // Update position and nextSequenceRunAt
          await db
            .update(campaignLeads)
            .set({
              position: dayInSequence,
              nextSequenceRunAt: nextRunAt,
            })
            .where(
              and(
                eq(campaignLeads.leadId, lead.leadId),
                eq(campaignLeads.campaignId, lead.campaignId)
              )
            );
        } else {
          // Sequence complete
          await db
            .update(campaignLeads)
            .set({
              position: 30,
              status: "completed",
              nextSequenceRunAt: null,
            })
            .where(
              and(
                eq(campaignLeads.leadId, lead.leadId),
                eq(campaignLeads.campaignId, lead.campaignId)
              )
            );
        }
      } else {
        skipped++;
      }

      processed++;
    }

    const duration = Date.now() - startTime;

    console.log("[GIANNA Cron] Loop completed", {
      processed,
      skipped,
      queued,
      duration,
    });

    return NextResponse.json({
      success: true,
      action: "processed",
      processed,
      skipped,
      queued,
      duration,
      stats: smsQueueService.getStats(),
    });

  } catch (error) {
    console.error("[GIANNA Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET for status check
export async function GET(request: NextRequest) {
  if (!validateCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const stats = smsQueueService.getStats();

    return NextResponse.json({
      success: true,
      status: "ready",
      loop: {
        touchDays: TOUCH_DAYS,
        workers: ["gianna", "cathy", "sabrina"],
      },
      queueStats: stats,
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
