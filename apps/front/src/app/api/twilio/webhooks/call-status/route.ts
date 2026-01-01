import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/twilio/webhooks/call-status
 *
 * Webhook for Twilio call status updates.
 * Called when call status changes: initiated, ringing, answered, completed, etc.
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

// Log call status to database
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
  // TODO: Update call_logs table with status
  // await db.update(callLogs)
  //   .set({ status: data.status, duration: data.duration, answeredBy: data.answeredBy })
  //   .where(eq(callLogs.callSid, data.callSid));

  console.log("[Twilio] Call status logged:", data);
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
