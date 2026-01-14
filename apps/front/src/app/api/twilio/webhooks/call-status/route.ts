import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { resolveTenantFromVoiceNumber } from "@/lib/voice/call-context";

/**
 * POST /api/twilio/webhooks/call-status
 *
 * Webhook for Twilio call status updates.
 * Called when call status changes: initiated, ringing, answered, completed, etc.
 *
 * Multi-tenant: Updates twilio_call_logs with status changes.
 */

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || "";
    const teamId = searchParams.get("teamId") || "";

    // Parse Twilio webhook data
    const formData = await request.formData();

    const callSid = (formData.get("CallSid") as string) || "";
    const callStatus = (formData.get("CallStatus") as string) || "";
    const callDuration = (formData.get("CallDuration") as string) || "0";
    const to = (formData.get("To") as string) || "";
    const from = (formData.get("From") as string) || "";
    const direction = (formData.get("Direction") as string) || "";
    const answeredBy = (formData.get("AnsweredBy") as string) || "";

    console.log(
      `[Twilio Call Status] ${callSid}: ${callStatus} (${callDuration}s)`,
    );
    console.log(`  Direction: ${direction}, To: ${to}, From: ${from}`);
    if (answeredBy) console.log(`  AnsweredBy: ${answeredBy}`);

    // Log call status update
    await logCallStatus({
      callSid,
      status: callStatus,
      duration: parseInt(callDuration, 10),
      to,
      from,
      direction,
      answeredBy,
      leadId,
      teamId,
    });

    // Handle specific statuses
    if (callStatus === "completed") {
      // Call finished - could trigger follow-up actions
      console.log(
        `[Twilio] Call ${callSid} completed - Duration: ${callDuration}s`,
      );

      // If answered by machine, could schedule a callback
      if (answeredBy === "machine_start" || answeredBy === "machine_end_beep") {
        console.log(
          `[Twilio] Machine detected - could schedule callback for lead ${leadId}`,
        );
      }
    }

    if (
      callStatus === "no-answer" ||
      callStatus === "busy" ||
      callStatus === "failed"
    ) {
      console.log(
        `[Twilio] Call ${callSid} ${callStatus} - could schedule retry`,
      );
    }

    // Return 200 to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[Twilio Call Status] Error:", error);
    // Still return 200 to prevent Twilio retries
    return new NextResponse("Error logged", { status: 200 });
  }
}

// Log call status to database (upsert pattern)
async function logCallStatus(data: {
  callSid: string;
  status: string;
  duration: number;
  to: string;
  from: string;
  direction: string;
  answeredBy: string;
  leadId: string;
  teamId: string;
}) {
  try {
    // Try to resolve tenant from phone number if teamId not provided
    let resolvedTeamId = data.teamId;
    if (!resolvedTeamId || resolvedTeamId === "") {
      // For inbound, resolve from "to" number; for outbound, from "from" number
      const lookupNumber = data.direction === "inbound" ? data.to : data.from;
      const tenantInfo = await resolveTenantFromVoiceNumber(lookupNumber);
      if (tenantInfo) {
        resolvedTeamId = tenantInfo.teamId;
      }
    }

    const teamId = resolvedTeamId || "default_team";

    // Upsert: Update if exists, insert if not
    // This handles the case where we get status updates before the initial log
    await db.execute(sql`
      INSERT INTO twilio_call_logs (
        id, team_id, lead_id, call_sid, from_number, to_number,
        direction, status, duration_seconds, answered_by,
        end_time, created_at, updated_at
      ) VALUES (
        ${"tcl_" + data.callSid.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)},
        ${teamId},
        ${data.leadId || null},
        ${data.callSid},
        ${data.from},
        ${data.to},
        ${data.direction || "outbound"},
        ${data.status},
        ${data.duration},
        ${data.answeredBy || null},
        ${data.status === "completed" ? sql`NOW()` : null},
        NOW(),
        NOW()
      )
      ON CONFLICT (call_sid) DO UPDATE SET
        status = ${data.status},
        duration_seconds = ${data.duration},
        answered_by = COALESCE(${data.answeredBy || null}, twilio_call_logs.answered_by),
        end_time = CASE WHEN ${data.status} = 'completed' THEN NOW() ELSE twilio_call_logs.end_time END,
        updated_at = NOW()
    `);

    console.log("[Twilio] Call status persisted:", {
      callSid: data.callSid,
      status: data.status,
      teamId,
    });
  } catch (error) {
    // Don't fail the webhook if DB update fails
    console.error("[Twilio] Failed to persist call status:", error);
  }
}

// GET - Return webhook info
export async function GET() {
  return NextResponse.json({
    endpoint: "Twilio Call Status Webhook",
    description: "Receives call status updates from Twilio",
    events: [
      "initiated",
      "ringing",
      "answered",
      "completed",
      "busy",
      "no-answer",
      "failed",
    ],
    method: "POST (called by Twilio)",
  });
}
