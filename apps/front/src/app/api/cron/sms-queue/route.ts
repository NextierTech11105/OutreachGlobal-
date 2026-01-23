/**
 * SMS Queue Auto-Processing Cron
 *
 * This endpoint should be called by DigitalOcean App Platform's cron scheduler
 * or an external cron service (e.g., cron-job.org) every minute.
 *
 * Processes pending SMS messages through SignalHouse.
 *
 * DigitalOcean App Spec:
 * jobs:
 *   - name: sms-queue-processor
 *     kind: CRON
 *     schedule: "* * * * *"
 *     http_request:
 *       url: ${APP_URL}/api/cron/sms-queue
 *       method: POST
 *       headers:
 *         Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";

// Simple auth check for cron endpoint
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow (for development)
  if (!cronSecret) {
    console.log("[SMS Cron] Warning: CRON_SECRET not set, allowing request");
    return true;
  }

  // Check Bearer token
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also check query param for simple cron services
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") === cronSecret) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  // Validate cron authentication
  if (!validateCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();
    const stats = smsQueueService.getStats();

    console.log("[SMS Cron] Starting queue processing", {
      pending: stats.pending,
      approved: stats.approved,
      draft: stats.draft,
      sentToday: stats.sentToday,
      remainingToday: stats.remainingToday,
      isWithinSchedule: stats.isWithinSchedule,
    });

    // Check if we have anything to process
    if (stats.pending === 0) {
      // Check if we have approved messages to deploy
      if (stats.approved > 0) {
        console.log("[SMS Cron] Deploying approved messages to pending");
        const deployResult = smsQueueService.deployApproved({ limit: 250 });

        return NextResponse.json({
          success: true,
          action: "deployed",
          deployed: deployResult.deployed,
          message: `Deployed ${deployResult.deployed} approved messages to pending queue`,
        });
      }

      return NextResponse.json({
        success: true,
        action: "no_work",
        message: "No pending or approved messages to process",
        stats: {
          draft: stats.draft,
          approved: stats.approved,
          pending: stats.pending,
        },
      });
    }

    // Check schedule
    if (!stats.isWithinSchedule) {
      return NextResponse.json({
        success: true,
        action: "outside_schedule",
        message: "Outside scheduled hours",
        nextBatchAt: stats.nextBatchAt,
        stats: {
          pending: stats.pending,
          scheduleHours: smsQueueService.getConfig().scheduleHours,
        },
      });
    }

    // Check daily limit
    if (stats.remainingToday <= 0) {
      return NextResponse.json({
        success: true,
        action: "daily_limit",
        message: "Daily limit reached",
        stats: {
          sentToday: stats.sentToday,
          maxPerDay: smsQueueService.getConfig().maxPerDay,
        },
      });
    }

    // Process batch
    const result = await smsQueueService.processBatch();

    if (!result) {
      return NextResponse.json({
        success: true,
        action: "skipped",
        message: "Batch processing skipped (already processing or no work)",
        duration: Date.now() - startTime,
      });
    }

    console.log("[SMS Cron] Batch completed", {
      batchId: result.batchId,
      sent: result.sent,
      failed: result.failed,
      duration: result.duration,
    });

    return NextResponse.json({
      success: true,
      action: "processed",
      batchId: result.batchId,
      sent: result.sent,
      failed: result.failed,
      duration: result.duration,
      stats: smsQueueService.getStats(),
    });

  } catch (error) {
    console.error("[SMS Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing/monitoring
export async function GET(request: NextRequest) {
  // Validate cron authentication
  if (!validateCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const stats = smsQueueService.getStats();
    const config = smsQueueService.getConfig();

    return NextResponse.json({
      success: true,
      status: "ready",
      stats,
      config: {
        batchSize: config.batchSize,
        maxPerDay: config.maxPerDay,
        maxPerHour: config.maxPerHour,
        scheduleHours: config.scheduleHours,
        scheduleDays: config.scheduleDays,
        timezone: config.timezone,
      },
      signalhouse: {
        configured: !!process.env.SIGNALHOUSE_API_KEY,
        fromNumber: process.env.SIGNALHOUSE_FROM_NUMBER ? "configured" : "missing",
      },
    });

  } catch (error) {
    console.error("[SMS Cron] Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
