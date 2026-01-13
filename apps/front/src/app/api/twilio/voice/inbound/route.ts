import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, eq } from "drizzle-orm";
import { leads } from "@/lib/db/schema";
import { resolveTenantFromVoiceNumber } from "@/lib/voice/call-context";

/**
 * POST /api/twilio/voice/inbound
 *
 * TwiML webhook for INBOUND calls.
 * When someone calls your Twilio number, this determines what happens.
 *
 * Multi-tenant: Resolves tenant from the receiving phone number to route
 * calls to the correct team's agents.
 *
 * Set this URL in Twilio Console:
 * Phone Numbers → Your Number → Voice & Fax → "A Call Comes In" → Webhook
 */

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData();

    const from = (formData.get("From") as string) || "";
    const to = (formData.get("To") as string) || "";
    const callSid = (formData.get("CallSid") as string) || "";
    const callStatus = (formData.get("CallStatus") as string) || "";

    console.log(`[Twilio Voice] INBOUND call from ${from} to ${to}`);
    console.log(`  CallSid: ${callSid}, Status: ${callStatus}`);

    // Multi-tenant: Resolve which team owns this phone number
    const tenantInfo = await resolveTenantFromVoiceNumber(to);
    if (tenantInfo) {
      console.log(
        `[Twilio Voice] Tenant resolved: team=${tenantInfo.teamId} (${tenantInfo.teamName})`,
      );
    } else {
      console.warn(
        `[Twilio Voice] Unknown inbound number: ${to} - using default routing`,
      );
    }

    // Look up who's calling (by phone number)
    const callerInfo = await lookupCaller(from);
    const callerName = callerInfo?.name;

    // Log inbound call to database
    await logInboundCall({
      callSid,
      from,
      to,
      teamId: tenantInfo?.teamId,
      leadId: callerInfo?.leadId,
    });

    // Generate TwiML response
    // Options:
    // 1. Connect to browser client (Twilio.Device) - for click-to-answer in app
    // 2. Forward to another phone
    // 3. Play voicemail greeting

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please hold while we connect you.</Say>
  <Dial timeout="30" action="/api/twilio/webhooks/call-status">
    <Client>inbound-agent</Client>
  </Dial>
  <Say voice="alice">We're sorry, no one is available to take your call. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/api/twilio/webhooks/voicemail" transcribe="true" />
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("[Twilio Voice] Inbound error:", error);

    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(errorTwiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}

// Look up caller by phone number
async function lookupCaller(
  phone: string
): Promise<{ name: string; leadId: string } | null> {
  try {
    // Normalize phone number for lookup
    const digits = phone.replace(/\D/g, "");
    const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;

    // Query leads table by phone number
    const lead = await db.query.leads.findFirst({
      where: eq(leads.phone, normalized),
    });

    if (lead) {
      const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
      console.log(`[Twilio] Caller identified: ${name} (${lead.id})`);
      return { name: name || "Unknown", leadId: lead.id };
    }

    // Try alternate formats
    const leadAlt = await db.query.leads.findFirst({
      where: eq(leads.phone, phone),
    });

    if (leadAlt) {
      const name = [leadAlt.firstName, leadAlt.lastName]
        .filter(Boolean)
        .join(" ");
      return { name: name || "Unknown", leadId: leadAlt.id };
    }

    console.log(`[Twilio] Unknown caller: ${phone}`);
    return null;
  } catch (error) {
    console.error("[Twilio] Error looking up caller:", error);
    return null;
  }
}

// Log inbound call to database
async function logInboundCall(data: {
  callSid: string;
  from: string;
  to: string;
  teamId?: string;
  leadId?: string;
}): Promise<void> {
  try {
    const id = `tcl_${data.callSid.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)}`;
    const teamId = data.teamId || "default_team";

    await db.execute(sql`
      INSERT INTO twilio_call_logs (
        id, team_id, lead_id, call_sid, from_number, to_number,
        direction, status, start_time, created_at, updated_at
      ) VALUES (
        ${id}, ${teamId}, ${data.leadId || null}, ${data.callSid},
        ${data.from}, ${data.to}, 'inbound', 'ringing',
        NOW(), NOW(), NOW()
      )
      ON CONFLICT (call_sid) DO NOTHING
    `);

    console.log("[Twilio] Inbound call logged:", {
      id,
      callSid: data.callSid,
      teamId,
    });
  } catch (error) {
    console.error("[Twilio] Failed to log inbound call:", error);
  }
}

// GET - Return webhook info
export async function GET() {
  return NextResponse.json({
    endpoint: "Twilio Voice Inbound Webhook",
    description: "TwiML endpoint for incoming calls",
    setup: {
      step1: "Go to Twilio Console → Phone Numbers",
      step2: "Click your phone number",
      step3: "Under Voice & Fax → A Call Comes In",
      step4:
        "Set Webhook URL to: https://your-domain.com/api/twilio/voice/inbound",
    },
    method: "POST (called by Twilio)",
  });
}
