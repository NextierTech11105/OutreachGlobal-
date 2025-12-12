import { sf, sfd } from "@/lib/utils/safe-format";
import { NextRequest, NextResponse } from "next/server";
import { automationService } from "@/lib/services/automation-service";

// Twilio SMS Webhook - Handles inbound SMS messages
// Configure in Twilio Console: Messaging Request URL
// Integrates with Automation Service for:
// - Retarget/Nurture drip management
// - Hot lead flagging
// - Email capture & auto-send
// - Opt-out/wrong number handling

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

// Lead/conversation context lookup (simplified - would query DB in production)
interface ConversationContext {
  leadId?: string;
  firstName?: string;
  propertyId?: string;
  propertyAddress?: string;
}

async function getConversationContext(
  phone: string,
): Promise<ConversationContext> {
  // In production: lookup lead by phone number
  // For now, return empty context
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

    // Store the message
    recentSmsMessages.unshift({
      messageSid,
      from,
      to,
      body,
      numMedia,
      receivedAt: new Date().toISOString(),
    });

    if (recentSmsMessages.length > 100) {
      recentSmsMessages.pop();
    }

    // Get conversation context for the sender
    const context = await getConversationContext(from);
    const leadId = context.leadId || `lead_${from.replace(/\D/g, "")}`;

    // =========================================================
    // AUTOMATION SERVICE - Process all incoming messages
    // Handles: opt-out, wrong number, email capture, interest
    // =========================================================
    const automationResult = automationService.processIncomingMessage(
      leadId,
      from,
      body,
      context.propertyId,
    );

    console.log(`[Twilio SMS] Automation result:`, automationResult);

    // Handle based on classification
    switch (automationResult.classification) {
      case "opt_out": {
        // Automation service already handled opt-out
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
        // Automation service already handled wrong number
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

      case "email_provided": {
        const email = automationResult.extractedEmail;
        console.log(
          `[Twilio SMS] Email captured: ${email} - Flagged as HOT LEAD`,
        );

        // Trigger valuation email in background
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

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Perfect! Sending your property analysis to ${email} now. Check your inbox in about a minute!
  </Message>
</Response>`;
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }

      case "appointment_request": {
        console.log(`[Twilio SMS] CALL REQUEST from ${from} - HOT LEAD`);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Absolutely! I'll give you a call shortly. What time works best for you today?
  </Message>
</Response>`;
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }

      case "interested": {
        console.log(
          `[Twilio SMS] Interest signal from ${from} - Nurture drip activated`,
        );
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Great to hear! I'd love to chat more. Would you prefer a quick call or should I send over some info via email?
  </Message>
</Response>`;
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }

      case "valuation_request": {
        // Someone asked for a valuation report - run it automatically
        console.log(
          `[Twilio SMS] VALUATION REQUEST from ${from} - Running PropertyDetail`,
        );

        // If we have property context, generate valuation immediately
        if (context.propertyId || context.propertyAddress) {
          // Trigger valuation in background
          fetch(`${APP_URL}/api/property/valuation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: context.propertyId,
              address: context.propertyAddress,
            }),
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                // Send the valuation link via SMS
                const reportUrl = `${APP_URL}/report/${context.propertyId || "valuation"}`;
                const estimatedValue = data.valuation?.estimatedValue;
                const valueStr = estimatedValue
                  ? `$${sf(estimatedValue)}`
                  : "your property";

                // Send follow-up SMS with report link
                fetch(`${APP_URL}/api/sms/send`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: from,
                    message: `Here's your property valuation! Estimated value: ${valueStr}\n\nView full report: ${reportUrl}`,
                  }),
                }).catch((err) =>
                  console.error(
                    "[Twilio SMS] Failed to send valuation link:",
                    err,
                  ),
                );
              }
            })
            .catch((err) =>
              console.error("[Twilio SMS] Valuation generation failed:", err),
            );

          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Absolutely! I'm pulling together your property valuation report right now. Give me about 30 seconds and I'll send you the link!
  </Message>
</Response>`;
          return new NextResponse(twiml, {
            status: 200,
            headers: { "Content-Type": "application/xml" },
          });
        } else {
          // No property context - ask for address
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    I'd be happy to get you a property valuation! Just send me the address and I'll pull up the report for you.
  </Message>
</Response>`;
          return new NextResponse(twiml, {
            status: 200,
            headers: { "Content-Type": "application/xml" },
          });
        }
      }

      case "question": {
        console.log(
          `[Twilio SMS] Question from ${from} - Needs human response`,
        );
        // Queue for human review but acknowledge
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Great question! Let me look into that and get back to you shortly.
  </Message>
</Response>`;
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }

      default: {
        // Unclear response - phone is confirmed, needs human review
        console.log(
          `[Twilio SMS] Unclear response from ${from} - Phone confirmed`,
        );
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    Thanks for your message! A team member will get back to you shortly.
  </Message>
</Response>`;
        return new NextResponse(twiml, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        });
      }
    }
  } catch (error: unknown) {
    console.error("[Twilio SMS] Error:", error);

    // Return empty response on error (don't send anything to user)
    return new NextResponse("", { status: 200 });
  }
}
