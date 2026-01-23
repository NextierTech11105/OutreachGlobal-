/**
 * SEQUENCE EXECUTOR CRON
 *
 * Processes enrolled leads through their sequences.
 * Called every 5 minutes by DigitalOcean App Platform cron job.
 *
 * Flow:
 * 1. Find enrollments where nextStepAt <= now
 * 2. Execute the step (SMS/Email/Voice)
 * 3. Schedule next step or mark complete
 */

import { NextRequest, NextResponse } from "next/server";
import { sequenceExecutor, processEnrolledLeads } from "@/lib/sequences/sequence-executor";

// Simple auth check for cron endpoint
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.log("[Sequence Cron] Warning: CRON_SECRET not set, allowing request");
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

export async function POST(request: NextRequest) {
  if (!validateCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();

    console.log("[Sequence Cron] Starting sequence processing");

    // Process up to 50 enrolled leads per run
    const result = await processEnrolledLeads(50);

    console.log("[Sequence Cron] Processing complete", {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      completed: result.completed,
      duration: result.duration,
    });

    return NextResponse.json({
      success: true,
      action: result.processed > 0 ? "processed" : "no_work",
      ...result,
    });

  } catch (error) {
    console.error("[Sequence Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!validateCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // List all registered sequences
    const sequences = sequenceExecutor.listSequences();

    return NextResponse.json({
      success: true,
      status: "ready",
      registeredSequences: sequences.length,
      sequences: sequences.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        steps: s.steps.length,
        worker: s.worker,
      })),
      channels: {
        sms: !!process.env.SIGNALHOUSE_API_KEY,
        email: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
        voice: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      },
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
