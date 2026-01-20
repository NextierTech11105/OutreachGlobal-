import { sf, sfd } from "@/lib/utils/safe-format";
import { NextRequest, NextResponse } from "next/server";
import { automationService } from "@/lib/services/automation-service";
import { autoRespondService } from "@/lib/services/auto-respond";
import { db } from "@/lib/db";
import { leads, smsMessages } from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// Twilio SMS Webhook - Handles inbound SMS messages
// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE:
// - Opt-out/wrong number: Instant TwiML response (critical compliance)
// - Everything else: No instant reply, auto-respond in 3-5 min (feels human)
// - All messages stored to sms_messages table
// - GIANNA personality used for auto-responses
// ═══════════════════════════════════════════════════════════════════════════

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://monkfish-app-mb7h3.ondigitalocean.app";
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

interface TwilioSmsPayload {
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

// Lead/conversation context lookup
interface ConversationContext {
  leadId?: string;
  firstName?: string;
  propertyId?: string;
  propertyAddress?: string;
}

async function getConversationContext(
  phone: string,
): Promise<ConversationContext> {
  try {
    // Normalize phone for searching
    const normalized = phone.replace(/\D/g, "").slice(-10);
    if (normalized.length < 10) return {};

    const leadResults = await db
      .select({
        id: leads.id,
        firstName: leads.firstName,
        tags: leads.tags,
      })
      .from(leads)
      .where(
        or(
          eq(leads.mobilePhone, phone),
          eq(leads.phone, phone),
          eq(leads.mobilePhone, `+1${normalized}`),
          eq(leads.phone, `+1${normalized}`),
        ),
      )
      .limit(1);

    if (leadResults.length > 0) {
      const lead = leadResults[0];

      // ═══════════════════════════════════════════════════════════════════
      // GREEN TAG: Lead responded! Add "responded" tag for highest priority
      // ═══════════════════════════════════════════════════════════════════
      // Priority Hierarchy:
      //   GREEN = responded (3x priority) - HOTTEST leads
      //   GOLD = skip traced + mobile + email (2x priority)
      //   Standard = base priority (1x)
      const currentTags = (lead.tags as string[]) || [];
      if (!currentTags.includes("responded")) {
        await db
          .update(leads)
          .set({
            tags: sql`array_append(COALESCE(tags, ARRAY[]::text[]), 'responded')`,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));
        console.log(
          `[Twilio SMS] 🟢 GREEN TAG: Added 'responded' to lead ${lead.id} → 3x priority boost`,
        );
      }

      return {
        leadId: lead.id,
        firstName: lead.firstName || undefined,
      };
    }
  } catch (error) {
    console.error("[Twilio SMS] Lead lookup error:", error);
  }
  return {};
}

// Store recent messages (in production, save to DB)
const recentSmsMessages: Array<{
  messageSid: string;
  from: string;
  to: string;
  body: string;
  numMedia: number;
  receivedAt: string;
}> = [];

// GET - Retrieve recent SMS messages
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  return NextResponse.json({
    success: true,
    count: recentSmsMessages.length,
    messages: recentSmsMessages.slice(0, limit),
  });
}

// POST - Handle incoming Twilio SMS webhook
export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-urlencoded data
    const formData = await request.formData();
    const payload: Record<string, string> = {};

    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });

    const messageSid = payload.MessageSid || `sms_${Date.now()}`;
    const from = payload.From || "";
    const to = payload.To || "";
    const body = payload.Body || "";
    const numMedia = parseInt(payload.NumMedia || "0");

    console.log(`[Twilio SMS] Inbound from ${from}: ${body}`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Store inbound message to database (ALWAYS)
    // ═══════════════════════════════════════════════════════════════════════
    const messageId = uuid();
    try {
      await db.insert(smsMessages).values({
        id: messageId,
        direction: "inbound",
        fromNumber: from,
        toNumber: to,
        body: body,
        status: "received",
        provider: "twilio",
        leadId: null, // Will update after context lookup
        campaignId: null,
        receivedAt: new Date(),
        sentByAdvisor: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (dbErr) {
      console.error("[Twilio SMS] Failed to store message:", dbErr);
    }

    // Store in memory cache too
    recentSmsMessages.unshift({
      messageSid,
      from,
      to,
      body,
      numMedia,
      receivedAt: new Date().toISOString(),
    });
    if (recentSmsMessages.length > 100) recentSmsMessages.pop();

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Get conversation context (lead lookup, add responded tag)
    // ═══════════════════════════════════════════════════════════════════════
    const context = await getConversationContext(from);
    const leadId = context.leadId || `lead_${from.replace(/\D/g, "")}`;

    // Update message with lead ID if found
    if (context.leadId) {
      try {
        await db
          .update(smsMessages)
          .set({ leadId: context.leadId })
          .where(eq(smsMessages.id, messageId));
      } catch {}
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Classify message via automation service
    // ═══════════════════════════════════════════════════════════════════════
    const automationResult = await automationService.processIncomingMessage(
      leadId,
      from,
      body,
      context.propertyId,
    );

    console.log(`[Twilio SMS] Classification: ${automationResult.classification}`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Handle based on classification
    // - opt_out/wrong_number: INSTANT TwiML (compliance required)
    // - everything else: NO instant reply, schedule 3-5 min auto-respond
    // ═══════════════════════════════════════════════════════════════════════

    // Map automation classification to GIANNA intent
    const intentMap: Record<string, string> = {
      opt_out: "opt_out",
      wrong_number: "hard_no",
      email_provided: "request_info",
      appointment_request: "request_call",
      interested: "interested",
      valuation_request: "request_info",
      question: "question",
      unclear: "confusion",
    };

    const giannaIntent = intentMap[automationResult.classification] || "confusion";

    switch (automationResult.classification) {
      // ═══════════════════════════════════════════════════════════════════
      // INSTANT RESPONSES (compliance required)
      // ═══════════════════════════════════════════════════════════════════
      case "opt_out": {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    You have been unsubscribed and will no longer receive messages from us. Reply START to re-subscribe.
  </Message>
</Response>`;
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }

      case "wrong_number": {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    So sorry for the mixup! Have a great day.
  </Message>
</Response>`;
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // DELAYED RESPONSES (3-5 min via auto-respond, feels human)
      // ═══════════════════════════════════════════════════════════════════
      default: {
        // Get team config (uses default if not set)
        const config = autoRespondService.getConfig("default");

        if (config.enabled) {
          // Schedule auto-respond with 3-5 min delay using GIANNA
          const scheduled = await autoRespondService.schedule({
            toPhone: from,
            fromPhone: to,
            incomingMessage: body,
            intent: giannaIntent as any,
            leadId: context.leadId,
            teamId: "default",
            leadContext: {
              firstName: context.firstName,
              propertyAddress: context.propertyAddress,
            },
          });

          if (scheduled.scheduled) {
            console.log(
              `[Twilio SMS] Auto-respond scheduled in 3-5 min → ${from} (${automationResult.classification})`
            );
          }
        }

        // Handle special cases that need background work
        if (automationResult.classification === "email_provided") {
          const email = automationResult.extractedEmail;
          console.log(`[Twilio SMS] Email captured: ${email} - HOT LEAD`);

          // Trigger email automation in background
          fetch(`${APP_URL}/api/automation/email-capture`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              smsMessage: body,
              fromPhone: from,
              toPhone: to,
              firstName: context.firstName,
              propertyId: context.propertyId,
              propertyAddress: context.propertyAddress,
              leadId,
            }),
          }).catch((err) =>
            console.error("[Twilio SMS] Email automation failed:", err),
          );
        }

        if (automationResult.classification === "appointment_request") {
          console.log(`[Twilio SMS] CALL REQUEST from ${from} - HOT LEAD`);
          // Could trigger call queue here
        }

        if (automationResult.classification === "interested") {
          console.log(`[Twilio SMS] Interest signal from ${from}`);
        }

        // Return EMPTY TwiML - no instant response
        // Auto-respond will send in 3-5 minutes
        const emptyTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;
        return new NextResponse(emptyTwiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }
    }
  } catch (error: unknown) {
    console.error("[Twilio SMS] Error:", error);
    return new NextResponse("", { status: 200 });
  }
}
