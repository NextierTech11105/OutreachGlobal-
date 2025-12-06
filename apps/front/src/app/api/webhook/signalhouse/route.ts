import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";

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

// Store recent inbound messages (in production, save to DB)
const recentInboundMessages: Array<{
  id: string;
  from: string;
  to: string;
  body: string;
  receivedAt: string;
  status: string;
  campaignId?: string;
  isLead?: boolean; // true if response indicates interest
}> = [];

// Keywords that indicate a lead is interested
const POSITIVE_KEYWORDS = ["YES", "INTERESTED", "INFO", "MORE", "CALL", "DETAILS", "HELP"];
const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "OPT OUT"];

// GET - Retrieve recent inbound messages
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  return NextResponse.json({
    success: true,
    count: recentInboundMessages.length,
    messages: recentInboundMessages.slice(0, limit),
  });
}

// POST - Handle incoming webhooks from SignalHouse
export async function POST(request: NextRequest) {
  try {
    const payload: SignalHouseWebhookPayload = await request.json();

    // SignalHouse uses dot notation: message.received, message.sent, etc.
    const eventType = payload.event || "unknown";
    const messageId = payload.message_id || payload.messageId || `msg_${Date.now()}`;
    const messageBody = payload.text || payload.body || "";

    console.log(`[SignalHouse Webhook] Event: ${eventType}`, JSON.stringify(payload, null, 2));

    // Check if message is opt-out or positive lead response
    const upperBody = messageBody.toUpperCase().trim();
    const isOptOut = OPT_OUT_KEYWORDS.some(kw => upperBody.includes(kw));
    const isPositiveLead = POSITIVE_KEYWORDS.some(kw => upperBody.includes(kw));

    // Handle different event types (SignalHouse uses various formats)
    // Support both dot notation (message.received) and underscore (MESSAGE_RECEIVED)
    const normalizedEvent = eventType.toLowerCase().replace(/_/g, ".");

    switch (normalizedEvent) {
      case "message.received":
      case "sms.received":
      case "inbound": {
        // Inbound SMS received - potential lead response!
        const inboundMessage = {
          id: messageId,
          from: payload.from || "",
          to: payload.to || "",
          body: messageBody,
          receivedAt: payload.timestamp || new Date().toISOString(),
          status: isOptOut ? "opted_out" : "received",
          campaignId: payload.campaign_id,
          isLead: isPositiveLead && !isOptOut,
        };

        // Add to recent messages (keep last 100)
        recentInboundMessages.unshift(inboundMessage);
        if (recentInboundMessages.length > 100) {
          recentInboundMessages.pop();
        }

        if (isOptOut) {
          console.log(`[SignalHouse] OPT-OUT from ${inboundMessage.from}`);
          // Mark as opted-out in SMS queue service (cancels pending messages)
          smsQueueService.handleStopMessage(inboundMessage.from);
          // TODO: Mark lead as opted-out in database
        } else if (isPositiveLead) {
          console.log(`[SignalHouse] 🎯 LEAD RESPONSE from ${inboundMessage.from}: ${messageBody}`);
          // TODO: Flag as hot lead, notify team, update CRM
        } else {
          console.log(`[SignalHouse] Inbound SMS from ${inboundMessage.from}: ${messageBody}`);
        }

        // TODO: Save to database
        // TODO: Update lead activity

        return NextResponse.json({
          success: true,
          event: "inbound_sms",
          messageId,
          isOptOut,
          isLead: isPositiveLead,
          processed: true,
        });
      }

      case "message.sent":
      case "sms.sent":
      case "sent": {
        // Outbound SMS sent confirmation
        console.log(`[SignalHouse] Message ${messageId} sent`);

        return NextResponse.json({
          success: true,
          event: "message_sent",
          messageId,
          status: "sent",
        });
      }

      case "message.delivered":
      case "sms.delivered":
      case "delivered": {
        // SMS delivered to recipient
        console.log(`[SignalHouse] Message ${messageId} delivered`);

        return NextResponse.json({
          success: true,
          event: "delivered",
          messageId,
          status: "delivered",
        });
      }

      case "message.failed":
      case "sms.failed":
      case "failed":
      case "undelivered": {
        // SMS failed to deliver
        const errorCode = payload.error_code || payload.errorCode;
        const errorMessage = payload.error_message || payload.errorMessage;
        console.error(`[SignalHouse] Message ${messageId} FAILED: ${errorCode} - ${errorMessage}`);

        return NextResponse.json({
          success: true,
          event: "failed",
          messageId,
          status: "failed",
          errorCode,
          errorMessage,
        });
      }

      case "number.provisioned":
      case "number.purchased": {
        console.log(`[SignalHouse] Number provisioned: ${payload.from || payload.phone_number}`);
        return NextResponse.json({ success: true, event: "number_provisioned" });
      }

      case "number.ported": {
        console.log(`[SignalHouse] Number ported: ${payload.from || payload.phone_number}`);
        return NextResponse.json({ success: true, event: "number_ported" });
      }

      default: {
        // Log unknown events for debugging
        console.log(`[SignalHouse] Event: ${eventType}`, payload);
        return NextResponse.json({ success: true, event: eventType, logged: true });
      }
    }
  } catch (error: any) {
    console.error("[SignalHouse Webhook] Error processing webhook:", error);

    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
