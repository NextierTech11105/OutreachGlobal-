import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";
import { db } from "@/lib/db";
import { smsMessages, leads } from "@/lib/db/schema";
import { eq, and, or, desc, like } from "drizzle-orm";

// SignalHouse Webhook Handler
// Based on https://devapi.signalhouse.io/apiDocs
// Receives inbound SMS, delivery status updates, and other events
// Integrates with SMS Queue Service for opt-out handling

interface SignalHouseWebhookPayload {
  // Event identification (SignalHouse format)
  event: string; // "message.received", "message.sent", "message.delivered", "message.failed"

  // Message fields
  message_id?: string;
  messageId?: string;
  from: string; // Sender phone (E.164)
  to: string; // Recipient phone (E.164)
  text?: string; // Message body
  body?: string; // Alternative field name

  // Status fields
  status?: string; // "delivered", "failed", "sent"
  error_code?: string;
  errorCode?: string;
  error_message?: string;
  errorMessage?: string;

  // Metadata
  timestamp: string;
  campaign_id?: string;

  // Raw payload
  [key: string]: unknown;
}

// Keywords that indicate a lead is interested
const POSITIVE_KEYWORDS = [
  "YES",
  "INTERESTED",
  "INFO",
  "MORE",
  "CALL",
  "DETAILS",
  "HELP",
];
const OPT_OUT_KEYWORDS = [
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "OPTOUT",
  "OPT OUT",
];

/**
 * Helper to find a lead by phone number
 */
async function getLeadByPhone(phone: string) {
  if (!phone) return null;

  // Normalize phone for searching (last 10 digits)
  const normalized = phone.replace(/\D/g, "").slice(-10);
  if (normalized.length < 10) return null;

  try {
    const results = await db
      .select()
      .from(leads)
      .where(like(leads.phone, `%${normalized}%`))
      .limit(1);

    return results[0] || null;
  } catch (error) {
    console.error(
      `[SignalHouse Webhook] Error finding lead for ${phone}:`,
      error,
    );
    return null;
  }
}

// GET - Retrieve recent inbound messages from DB
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    const messages = await db
      .select()
      .from(smsMessages)
      .where(eq(smsMessages.direction, "inbound"))
      .orderBy(desc(smsMessages.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages: messages.map((m) => ({
        id: m.id,
        from: m.fromNumber,
        to: m.toNumber,
        body: m.body,
        receivedAt: m.receivedAt || m.createdAt,
        status: m.status,
        campaignId: m.campaignId,
        leadId: m.leadId,
      })),
    });
  } catch (error) {
    console.error("[SignalHouse Webhook] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

// POST - Handle incoming webhooks from SignalHouse
export async function POST(request: NextRequest) {
  try {
    const payload: SignalHouseWebhookPayload = await request.json();

    // SignalHouse uses dot notation: message.received, message.sent, etc.
    const eventType = payload.event || "unknown";
    const messageId =
      payload.message_id || payload.messageId || `msg_${Date.now()}`;
    const messageBody = payload.text || payload.body || "";
    const fromNumber = payload.from || "";
    const toNumber = payload.to || "";

    console.log(
      `[SignalHouse Webhook] Event: ${eventType}`,
      JSON.stringify(payload, null, 2),
    );

    // Check if message is opt-out or positive lead response
    const upperBody = messageBody.toUpperCase().trim();
    const isOptOut = OPT_OUT_KEYWORDS.some((kw) => upperBody.includes(kw));
    const isPositiveLead = POSITIVE_KEYWORDS.some((kw) =>
      upperBody.includes(kw),
    );

    // Handle different event types (SignalHouse uses various formats)
    // Support both dot notation (message.received) and underscore (MESSAGE_RECEIVED)
    const normalizedEvent = eventType.toLowerCase().replace(/_/g, ".");

    // Find lead associated with this communication
    // For inbound, search by 'from'. For outbound, search by 'to'.
    const searchPhone =
      normalizedEvent.includes("received") ||
      normalizedEvent.includes("inbound")
        ? fromNumber
        : toNumber;

    const lead = await getLeadByPhone(searchPhone);

    switch (normalizedEvent) {
      case "message.received":
      case "sms.received":
      case "inbound": {
        // Inbound SMS received - potential lead response!

        // Save to DB
        await db.insert(smsMessages).values({
          id: crypto.randomUUID(),
          leadId: lead?.id,
          direction: "inbound",
          fromNumber,
          toNumber,
          body: messageBody,
          status: isOptOut ? "opted_out" : "received",
          providerMessageId: messageId,
          campaignId: payload.campaign_id as string,
          receivedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (isOptOut) {
          console.log(`[SignalHouse] OPT-OUT from ${fromNumber}`);
          // Mark as opted-out in SMS queue service (cancels pending messages)
          smsQueueService.handleStopMessage(fromNumber);

          if (lead) {
            // Update lead status to opted_out in database
            await db
              .update(leads)
              .set({ status: "opted_out", updatedAt: new Date() })
              .where(eq(leads.id, lead.id));
          }
        } else if (isPositiveLead) {
          console.log(
            `[SignalHouse] 🎯 LEAD RESPONSE from ${fromNumber}: ${messageBody}`,
          );

          if (lead) {
            // Update lead status to interested
            await db
              .update(leads)
              .set({ status: "interested", updatedAt: new Date() })
              .where(eq(leads.id, lead.id));
          }
        }

        return NextResponse.json({ success: true, event: "inbound_sms" });
      }

      case "message.sent":
      case "sms.sent":
      case "sent":
      case "message.delivered":
      case "sms.delivered":
      case "delivered":
      case "message.failed":
      case "sms.failed":
      case "failed":
      case "undelivered": {
        // Update existing message status if found by providerMessageId
        if (messageId) {
          const status = normalizedEvent.split(".").pop() as string;
          await db
            .update(smsMessages)
            .set({
              status: status,
              providerStatus: (payload.status as string) || status,
              updatedAt: new Date(),
              deliveredAt: normalizedEvent.includes("delivered")
                ? new Date()
                : undefined,
            })
            .where(eq(smsMessages.providerMessageId, messageId));
        }
        return NextResponse.json({ success: true, event: "status_update" });
      }

      case "number.provisioned":
      case "number.purchased": {
        console.log(
          `[SignalHouse] Number provisioned: ${payload.from || payload.phone_number}`,
        );
        return NextResponse.json({
          success: true,
          event: "number_provisioned",
        });
      }

      case "number.ported": {
        console.log(
          `[SignalHouse] Number ported: ${payload.from || payload.phone_number}`,
        );
        return NextResponse.json({ success: true, event: "number_ported" });
      }

      default:
        return NextResponse.json({ success: true, event: "ignored" });
    }
  } catch (error: any) {
    console.error("[SignalHouse Webhook] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
