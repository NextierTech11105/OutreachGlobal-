import { NextRequest, NextResponse } from "next/server";

// SignalHouse Webhook Handler
// Receives inbound SMS, delivery status updates, and other events

interface SignalHouseWebhookPayload {
  // Common fields
  event?: string;
  eventType?: string;
  type?: string;
  timestamp?: string;
  webhookId?: string;

  // Message fields
  messageId?: string;
  messageSid?: string;
  sid?: string;
  from?: string;
  to?: string;
  body?: string;
  status?: string;
  direction?: "inbound" | "outbound";

  // Number fields
  phoneNumber?: string;
  phone_number?: string;

  // Error fields
  errorCode?: string;
  errorMessage?: string;

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
}> = [];

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

    // Determine event type (SignalHouse may use different field names)
    const eventType = payload.event || payload.eventType || payload.type || "unknown";
    const messageId = payload.messageId || payload.messageSid || payload.sid || `msg_${Date.now()}`;

    console.log(`[SignalHouse Webhook] Event: ${eventType}`, JSON.stringify(payload, null, 2));

    // Handle different event types
    switch (eventType.toUpperCase()) {
      case "MESSAGE_RECEIVED":
      case "SMS_RECEIVED":
      case "INBOUND_SMS":
      case "INBOUND": {
        // Inbound SMS received
        const inboundMessage = {
          id: messageId,
          from: payload.from || "",
          to: payload.to || "",
          body: payload.body || "",
          receivedAt: payload.timestamp || new Date().toISOString(),
          status: "received",
        };

        // Add to recent messages (keep last 100)
        recentInboundMessages.unshift(inboundMessage);
        if (recentInboundMessages.length > 100) {
          recentInboundMessages.pop();
        }

        console.log(`[SignalHouse] Inbound SMS from ${inboundMessage.from}: ${inboundMessage.body}`);

        // TODO: Save to database
        // TODO: Trigger auto-response logic
        // TODO: Update lead activity

        return NextResponse.json({
          success: true,
          event: "inbound_sms",
          messageId,
          processed: true,
        });
      }

      case "MESSAGE_SENT":
      case "SMS_SENT":
      case "SENT": {
        // Outbound SMS sent confirmation
        console.log(`[SignalHouse] Message ${messageId} sent successfully`);

        // TODO: Update message status in database

        return NextResponse.json({
          success: true,
          event: "message_sent",
          messageId,
          status: "sent",
        });
      }

      case "MESSAGE_DELIVERED":
      case "SMS_DELIVERED":
      case "DELIVERED": {
        // SMS delivered to recipient
        console.log(`[SignalHouse] Message ${messageId} delivered`);

        // TODO: Update message status in database

        return NextResponse.json({
          success: true,
          event: "delivered",
          messageId,
          status: "delivered",
        });
      }

      case "MESSAGE_FAILED":
      case "SMS_FAILED":
      case "FAILED":
      case "UNDELIVERED": {
        // SMS failed to deliver
        console.error(`[SignalHouse] Message ${messageId} failed: ${payload.errorCode} - ${payload.errorMessage}`);

        // TODO: Update message status in database
        // TODO: Handle retry logic

        return NextResponse.json({
          success: true,
          event: "failed",
          messageId,
          status: "failed",
          errorCode: payload.errorCode,
          errorMessage: payload.errorMessage,
        });
      }

      case "NUMBER_PROVISIONED":
      case "NUMBER_PURCHASED": {
        // New number provisioned
        const phoneNumber = payload.phoneNumber || payload.phone_number;
        console.log(`[SignalHouse] Number provisioned: ${phoneNumber}`);

        return NextResponse.json({
          success: true,
          event: "number_provisioned",
          phoneNumber,
        });
      }

      case "NUMBER_PORTED": {
        // Number ported
        const phoneNumber = payload.phoneNumber || payload.phone_number;
        console.log(`[SignalHouse] Number ported: ${phoneNumber}`);

        return NextResponse.json({
          success: true,
          event: "number_ported",
          phoneNumber,
        });
      }

      case "OPT_OUT":
      case "UNSUBSCRIBE":
      case "STOP": {
        // User opted out of messages
        console.log(`[SignalHouse] Opt-out received from ${payload.from}`);

        // TODO: Mark lead as opted-out in database
        // TODO: Prevent future messages to this number

        return NextResponse.json({
          success: true,
          event: "opt_out",
          phone: payload.from,
        });
      }

      default: {
        // Log unknown event types for debugging
        console.log(`[SignalHouse] Unknown event type: ${eventType}`, payload);

        return NextResponse.json({
          success: true,
          event: eventType,
          message: "Event logged",
        });
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
