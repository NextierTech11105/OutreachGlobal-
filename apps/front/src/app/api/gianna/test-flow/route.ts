import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/signalhouse/client";

/**
 * GIANNA TEST FLOW API
 *
 * Quick test endpoint to validate the full SMS flow:
 * 1. Send test SMS from GIANNA (+15164079249)
 * 2. User replies
 * 3. Webhook receives → classifies → routes to call queue
 *
 * Usage:
 * POST /api/gianna/test-flow
 * {
 *   "to": "+1YOURPHONE",
 *   "message": "optional custom message"
 * }
 */

const GIANNA_NUMBER = process.env.SIGNALHOUSE_FROM_NUMBER || "+15164079249";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to) {
      return NextResponse.json(
        { error: "to (phone number) is required" },
        { status: 400 },
      );
    }

    // Clean phone number
    const cleanPhone = to.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("1")
      ? `+${cleanPhone}`
      : `+1${cleanPhone}`;

    // Default test message designed to elicit a response
    const testMessage =
      message ||
      `Hey! This is Emily from Homeowner Advisors - quick test. Reply with your email if you'd like more info, or just say YES/NO. Thanks!`;

    console.log(`[GIANNA Test] Sending to ${formattedPhone} from ${GIANNA_NUMBER}`);

    const result = await sendSMS({
      from: GIANNA_NUMBER,
      to: formattedPhone,
      message: testMessage,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.data?.messageId,
        from: GIANNA_NUMBER,
        to: formattedPhone,
        message: testMessage,
        nextSteps: [
          "1. Check your phone for the SMS",
          "2. Reply with: your email address (e.g. test@example.com)",
          "3. Or reply: YES, NO, STOP, or any message",
          "4. Check webhook logs and call queue for the response",
        ],
        webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/webhook/signalhouse`,
        callQueueUrl: "/api/call-center/queue",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          hint: "Check SignalHouse API key and balance",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[GIANNA Test] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test failed",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check configuration
export async function GET() {
  const configured = !!process.env.SIGNALHOUSE_API_KEY || !!process.env.SIGNALHOUSE_AUTH_TOKEN;
  const fromNumber = process.env.SIGNALHOUSE_FROM_NUMBER || "+15164079249";

  return NextResponse.json({
    status: configured ? "ready" : "not_configured",
    giannaNumber: fromNumber,
    signalhouseConfigured: configured,
    webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/webhook/signalhouse`,
    testInstructions: {
      method: "POST",
      endpoint: "/api/gianna/test-flow",
      body: {
        to: "+1YOURPHONE",
        message: "optional custom message",
      },
    },
  });
}
