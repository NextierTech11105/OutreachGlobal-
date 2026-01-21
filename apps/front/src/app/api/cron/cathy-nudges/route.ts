/**
 * CATHY Nudges Cron Job
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/cron/cathy-nudges - Process and send all due nudges
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This cron job should run every minute to check for due nudges.
 * CATHY schedules nudges with specific send times - this job sends them.
 *
 * Setup Options:
 *
 * 1. External Cron Service (Recommended for DigitalOcean):
 *    - cron-job.org (free tier available)
 *    - easycron.com
 *    - Uptime Robot with cron feature
 *
 *    URL: https://your-domain/api/cron/cathy-nudges
 *    Method: GET
 *    Header: Authorization: Bearer YOUR_CRON_SECRET
 *    Schedule: every minute (cron: * * * * *)
 *
 * 2. GitHub Actions (if using GitHub):
 *    .github/workflows/cathy-cron.yml
 *
 * 3. DigitalOcean Worker (if adding to app spec):
 *    Add job component with cron schedule
 *
 * Security:
 *   Requires CRON_SECRET env var for authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface ProcessResult {
  nudgeId: string;
  leadId: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

interface ScheduledNudge {
  id: string;
  leadId: string;
  attemptNumber: number;
  scheduledAt: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  humorLevel?: "mild" | "medium" | "spicy";
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret (if configured)
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      Logger.warn("Cron", "Unauthorized CATHY cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: ProcessResult[] = [];

  try {
    // 1. Fetch all due nudges from CATHY schedule endpoint
    const dueResponse = await fetch(`${API_URL}/api/cathy/schedule?due=true`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!dueResponse.ok) {
      Logger.error("Cron", "Failed to fetch due nudges", {
        status: dueResponse.status,
      });
      return NextResponse.json(
        { error: "Failed to fetch due nudges", status: dueResponse.status },
        { status: 500 }
      );
    }

    const dueData = await dueResponse.json();
    const dueNudges: ScheduledNudge[] = dueData.schedules || [];

    Logger.info("Cron", `[CATHY] Found ${dueNudges.length} due nudges`);

    if (dueNudges.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        results: [],
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Process each nudge
    for (const nudge of dueNudges) {
      try {
        // Send the nudge via CATHY nudge endpoint
        const nudgeResponse = await fetch(`${API_URL}/api/cathy/nudge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: nudge.leadId,
            attemptNumber: nudge.attemptNumber,
            send: true,
            trainingMode: false,
          }),
        });

        const nudgeResult = await nudgeResponse.json();

        if (nudgeResponse.ok && nudgeResult.success) {
          results.push({
            nudgeId: nudge.id,
            leadId: nudge.leadId,
            success: true,
            messageId: nudgeResult.messageId,
          });

          Logger.info("Cron", `[CATHY] Sent nudge ${nudge.id}`, {
            leadId: nudge.leadId,
            attemptNumber: nudge.attemptNumber,
          });
        } else {
          results.push({
            nudgeId: nudge.id,
            leadId: nudge.leadId,
            success: false,
            error: nudgeResult.error || "Unknown error",
          });

          Logger.error("Cron", `[CATHY] Failed to send nudge ${nudge.id}`, {
            error: nudgeResult.error,
          });
        }

        // Small delay between sends to avoid rate limiting
        // SignalHouse LOW_VOLUME = 75 SMS/min on AT&T
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (nudgeError) {
        const errorMessage =
          nudgeError instanceof Error ? nudgeError.message : "Unknown error";

        results.push({
          nudgeId: nudge.id,
          leadId: nudge.leadId,
          success: false,
          error: errorMessage,
        });

        Logger.error("Cron", `[CATHY] Error processing nudge ${nudge.id}`, {
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    Logger.info("Cron", "[CATHY] Processing complete", {
      processed: dueNudges.length,
      sent: successCount,
      failed: failCount,
    });

    return NextResponse.json({
      success: true,
      processed: dueNudges.length,
      sent: successCount,
      failed: failCount,
      results,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    Logger.error("Cron", "[CATHY] Cron job failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cron job failed",
        processed: 0,
        results,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// POST for manual trigger (with authentication)
export async function POST(request: NextRequest) {
  // Same logic as GET but requires auth
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse GET logic
  return GET(request);
}
