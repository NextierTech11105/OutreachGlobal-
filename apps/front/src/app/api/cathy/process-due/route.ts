/**
 * CATHY Process Due Nudges
 *
 * This endpoint processes all due nudges and sends them.
 * Should be called by a cron job every minute:
 *   curl -X POST https://your-domain/api/cathy/process-due
 *
 * Or triggered manually from admin panel.
 */

import { NextRequest, NextResponse } from "next/server";

const CATHY_SCHEDULE_API = process.env.NEXT_PUBLIC_API_URL || "";

interface ScheduledNudge {
  id: string;
  leadId: string;
  attemptNumber: number;
  scheduledAt: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  humorLevel?: "mild" | "medium" | "spicy";
}

interface ProcessResult {
  nudgeId: string;
  leadId: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const results: ProcessResult[] = [];

  try {
    // 1. Fetch all due nudges
    const dueResponse = await fetch(
      `${CATHY_SCHEDULE_API}/api/cathy/schedule?due=true`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!dueResponse.ok) {
      console.error("[CATHY] Failed to fetch due nudges:", dueResponse.status);
      return NextResponse.json(
        { error: "Failed to fetch due nudges", status: dueResponse.status },
        { status: 500 }
      );
    }

    const dueData = await dueResponse.json();
    const dueNudges: ScheduledNudge[] = dueData.schedules || [];

    console.log(`[CATHY] Found ${dueNudges.length} due nudges to process`);

    if (dueNudges.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        results: [],
        duration_ms: Date.now() - startTime,
      });
    }

    // 2. Process each nudge
    for (const nudge of dueNudges) {
      try {
        // Send the nudge
        const nudgeResponse = await fetch(
          `${CATHY_SCHEDULE_API}/api/cathy/nudge`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: nudge.leadId,
              attemptNumber: nudge.attemptNumber,
              send: true, // Actually send it
              trainingMode: false,
            }),
          }
        );

        const nudgeResult = await nudgeResponse.json();

        if (nudgeResponse.ok && nudgeResult.success) {
          results.push({
            nudgeId: nudge.id,
            leadId: nudge.leadId,
            success: true,
            messageId: nudgeResult.messageId,
          });

          console.log(
            `[CATHY] Sent nudge ${nudge.id} to lead ${nudge.leadId}`
          );
        } else {
          results.push({
            nudgeId: nudge.id,
            leadId: nudge.leadId,
            success: false,
            error: nudgeResult.error || "Unknown error",
          });

          console.error(
            `[CATHY] Failed to send nudge ${nudge.id}:`,
            nudgeResult.error
          );
        }

        // Small delay between sends to avoid rate limiting
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

        console.error(`[CATHY] Error processing nudge ${nudge.id}:`, nudgeError);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `[CATHY] Processing complete: ${successCount} sent, ${failCount} failed`
    );

    return NextResponse.json({
      success: true,
      processed: dueNudges.length,
      sent: successCount,
      failed: failCount,
      results,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[CATHY] Process due error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: message,
        processed: 0,
        results,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// GET - Check status of due nudges without processing
export async function GET(request: NextRequest) {
  try {
    const dueResponse = await fetch(
      `${CATHY_SCHEDULE_API}/api/cathy/schedule?due=true`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!dueResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch due nudges" },
        { status: 500 }
      );
    }

    const dueData = await dueResponse.json();

    return NextResponse.json({
      success: true,
      dueCount: dueData.schedules?.length || 0,
      schedules: dueData.schedules || [],
      summary: dueData.summary || {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
