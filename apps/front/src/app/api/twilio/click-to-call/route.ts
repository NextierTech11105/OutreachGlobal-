import { NextRequest, NextResponse } from "next/server";
import { Twilio } from "twilio";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getCallContext } from "@/lib/voice/call-context";

/**
 * POST /api/twilio/click-to-call
 *
 * Initiate an outbound call using Twilio.
 * Repeatable execution - can be triggered from calendar, inbox, or any lead view.
 *
 * Multi-tenant: Uses team's voice number from twilio_numbers table.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, leadId, teamId, callbackId, from } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: "Phone number (to) is required" },
        { status: 400 },
      );
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Twilio credentials not configured" },
        { status: 500 },
      );
    }

    // Normalize phone number
    const normalizedTo = normalizePhone(to);
    if (!normalizedTo) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 },
      );
    }

    const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Multi-tenant: Resolve outbound number from team's voice configuration
    let outboundNumber = from;

    if (!outboundNumber && teamId) {
      // Try to get team's voice number from database
      const callContext = await getCallContext(teamId, { leadId });
      if (callContext.success) {
        outboundNumber = callContext.context.twilioNumber;
        console.log(
          `[Click-to-Call] Using team ${teamId} voice number: ${outboundNumber}`,
        );
      } else {
        console.warn(
          `[Click-to-Call] Team ${teamId} has no voice number: ${callContext.error.message}`,
        );
      }
    }

    // Fallback to env var if no team number found
    if (!outboundNumber) {
      outboundNumber = process.env.TWILIO_DEFAULT_NUMBER;
    }

    if (!outboundNumber) {
      return NextResponse.json(
        { success: false, error: "No outbound number configured for team" },
        { status: 400 },
      );
    }

    // Create TwiML for the call
    const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/outbound?leadId=${leadId || ""}&teamId=${teamId || ""}`;

    // Initiate the call
    const call = await client.calls.create({
      to: normalizedTo,
      from: outboundNumber,
      url: twimlUrl,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhooks/call-status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      machineDetection: "Enable",
      machineDetectionTimeout: 5,
    });

    // Log the call
    await logCall({
      callSid: call.sid,
      teamId,
      leadId,
      callbackId,
      direction: "outbound",
      status: "initiated",
      to: normalizedTo,
      from: outboundNumber,
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error: any) {
    console.error("Click-to-call error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate call" },
      { status: 500 },
    );
  }
}

// Normalize phone to E.164 format
function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits[0] === "1") {
    return `+${digits}`;
  } else if (digits.length > 10) {
    return `+${digits}`;
  }

  return null;
}

// Log call to twilio_call_logs table
async function logCall(data: {
  callSid: string;
  teamId?: string;
  leadId?: string;
  callbackId?: string;
  direction: "outbound" | "inbound";
  status: string;
  to: string;
  from: string;
}) {
  try {
    // Generate ID with tcl prefix for twilio call logs
    const id = `tcl_${crypto.randomUUID().replace(/-/g, "")}`;
    const teamId = data.teamId || "default_team";

    // Insert into twilio_call_logs using raw SQL (schema is in API app)
    await db.execute(sql`
      INSERT INTO twilio_call_logs (
        id, team_id, lead_id, call_sid, from_number, to_number,
        direction, status, start_time, created_at, updated_at
      ) VALUES (
        ${id}, ${teamId}, ${data.leadId || null}, ${data.callSid},
        ${data.from}, ${data.to}, ${data.direction}, ${data.status},
        NOW(), NOW(), NOW()
      )
    `);

    console.log("[Click-to-Call] Call logged to DB:", {
      id,
      callSid: data.callSid,
      direction: data.direction,
    });
  } catch (error) {
    // Don't fail the call if logging fails
    console.error("[Click-to-Call] Failed to log call:", error);
  }
}
