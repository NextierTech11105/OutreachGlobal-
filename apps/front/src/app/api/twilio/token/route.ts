import { NextRequest, NextResponse } from "next/server";

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID || "";

// Generate a Twilio Capability Token for browser-based calling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    // Use "inbound-agent" identity to receive calls routed by the voice webhook
    const identity = body.identity || "inbound-agent";

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        {
          error: "Twilio not configured",
          configured: false,
          message: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required",
        },
        { status: 503 },
      );
    }

    if (!TWILIO_TWIML_APP_SID) {
      return NextResponse.json(
        {
          error: "TwiML App not configured",
          configured: false,
          message: "TWILIO_TWIML_APP_SID is required for browser calling",
        },
        { status: 503 },
      );
    }

    // Generate capability token using Twilio's JWT
    // We need to create a JWT token that grants capabilities
    const token = await generateCapabilityToken(identity);

    return NextResponse.json({
      success: true,
      token,
      identity,
    });
  } catch (error: unknown) {
    console.error("[Twilio Token] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Check Twilio configuration status
export async function GET() {
  const configured = !!(
    TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN &&
    TWILIO_TWIML_APP_SID
  );

  return NextResponse.json({
    configured,
    hasAccountSid: !!TWILIO_ACCOUNT_SID,
    hasAuthToken: !!TWILIO_AUTH_TOKEN,
    hasTwimlApp: !!TWILIO_TWIML_APP_SID,
  });
}

// Generate a capability token for Twilio Client
async function generateCapabilityToken(identity: string): Promise<string> {
  // Create a JWT token with Twilio capability grants
  // This is the server-side token generation for Twilio.Device

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour validity

  // JWT Header
  const header = {
    typ: "JWT",
    alg: "HS256",
    cty: "twilio-fpa;v=1",
  };

  // JWT Payload with Twilio grants
  const payload = {
    jti: `${TWILIO_ACCOUNT_SID}-${now}`,
    iss: TWILIO_ACCOUNT_SID,
    sub: TWILIO_ACCOUNT_SID,
    nbf: now,
    exp: expiry,
    grants: {
      identity: identity,
      voice: {
        incoming: {
          allow: true,
        },
        outgoing: {
          application_sid: TWILIO_TWIML_APP_SID,
        },
      },
    },
  };

  // Base64URL encode
  const base64UrlEncode = (obj: object) => {
    const json = JSON.stringify(obj);
    const base64 = Buffer.from(json).toString("base64");
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // Create HMAC-SHA256 signature using Node.js crypto
  const crypto = await import("crypto");
  const signature = crypto
    .createHmac("sha256", TWILIO_AUTH_TOKEN)
    .update(signatureInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${signatureInput}.${signature}`;
}
