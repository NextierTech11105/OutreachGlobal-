import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callHistories, leads } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * Twilio Voice Webhook
 *
 * Handles both:
 * - Inbound calls (leads calling back SMS campaign numbers)
 * - Status callbacks for outbound calls
 *
 * Inbound calls from SMS campaigns route to browser client for agent to answer.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    console.log("[Twilio Webhook] Received:", data);

    const callSid = data.CallSid;
    const callStatus = data.CallStatus;
    const direction = data.Direction; // "inbound" or "outbound-api"
    const from = data.From; // Caller's number (lead)
    const to = data.To; // Your number (SMS campaign number)
    const duration = data.CallDuration;

    // ═══════════════════════════════════════════════════════════════════════
    // INBOUND CALL - Lead calling back from SMS campaign
    // ═══════════════════════════════════════════════════════════════════════
    if (direction === "inbound") {
      console.log("[Twilio Webhook] Inbound call from:", from, "to:", to);

      // Try to find the lead by phone number
      let leadInfo: { id: string; name?: string; company?: string } | null = null;
      try {
        const leadResults = await db
          .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName, company: leads.company })
          .from(leads)
          .where(or(
            eq(leads.mobilePhone, from),
            eq(leads.phone, from),
            eq(leads.mobilePhone, from.replace("+1", "")),
            eq(leads.phone, from.replace("+1", ""))
          ))
          .limit(1);

        if (leadResults.length > 0) {
          const lead = leadResults[0];
          leadInfo = {
            id: lead.id,
            name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || undefined,
            company: lead.company || undefined,
          };
          console.log("[Twilio Webhook] Found lead:", leadInfo);
        }
      } catch (lookupError) {
        console.error("[Twilio Webhook] Lead lookup error:", lookupError);
      }

      // Log inbound call to database
      try {
        await db.insert(callHistories).values({
          id: crypto.randomUUID(),
          teamId: "default",
          leadId: leadInfo?.id || null,
          direction: "inbound",
          fromNumber: from,
          toNumber: to,
          status: "ringing",
          twilioSid: callSid,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (dbError) {
        console.error("[Twilio Webhook] DB insert error:", dbError);
      }

      // Route inbound call to browser client (agent)
      // Agent sees incoming call in InboundCallPanel, clicks to answer
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Please hold while we connect you to an agent.</Say>
  <Dial callerId="${from}" timeout="30" action="${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhook/twilio/no-answer">
    <Client>inbound-agent</Client>
  </Dial>
</Response>`;

      return new NextResponse(twiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATUS CALLBACK - Update existing call record
    // ═══════════════════════════════════════════════════════════════════════
    if (callSid && callStatus) {
      try {
        await db
          .update(callHistories)
          .set({
            status: callStatus,
            duration: duration ? parseInt(duration, 10) : null,
            updatedAt: new Date(),
          })
          .where(eq(callHistories.twilioSid, callSid));
      } catch (dbError) {
        console.error("[Twilio Webhook] DB update error:", dbError);
      }
    }

    // Default response for status callbacks
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Twilio Webhook] Error:", error);

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error processing your call. Please try again later.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(errorTwiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    type: "twilio-voice-webhook",
    endpoints: {
      voice: "POST /api/webhook/twilio",
      sms: "POST /api/webhook/sms/inbound",
    },
    configured: !!(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ),
  });
}
