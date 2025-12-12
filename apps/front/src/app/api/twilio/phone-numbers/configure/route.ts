import { NextRequest, NextResponse } from "next/server";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

// In-memory store for Gianna settings (would be database in production)
// In a real app, this would be stored in your database
const giannaSettings = new Map<
  string,
  {
    giannaEnabled: boolean;
    giannaMode: "inbound" | "outbound" | "both" | "off";
    giannaAvatar?: string;
    autoRespondMissedCalls?: boolean;
    scheduleFollowups?: boolean;
    transcribeVoicemails?: boolean;
  }
>();

// POST - Configure Gianna AI for a phone number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumberSid,
      giannaEnabled,
      giannaMode,
      giannaAvatar,
      autoRespondMissedCalls,
      scheduleFollowups,
      transcribeVoicemails,
    } = body;

    if (!phoneNumberSid) {
      return NextResponse.json(
        { error: "Phone number SID required" },
        { status: 400 },
      );
    }

    // Store settings
    giannaSettings.set(phoneNumberSid, {
      giannaEnabled: giannaEnabled ?? false,
      giannaMode: giannaMode ?? "off",
      giannaAvatar: giannaAvatar,
      autoRespondMissedCalls: autoRespondMissedCalls ?? true,
      scheduleFollowups: scheduleFollowups ?? true,
      transcribeVoicemails: transcribeVoicemails ?? true,
    });

    // If Gianna is enabled, configure Twilio webhooks
    if (giannaEnabled && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://monkfish-app-mb7h3.ondigitalocean.app";

      // Update Twilio webhooks to point to our Gianna handlers
      const webhookConfig: Record<string, string> = {};

      if (giannaMode === "inbound" || giannaMode === "both") {
        // SMS webhook
        webhookConfig.sms_url = `${baseUrl}/api/gianna/sms-webhook`;
        webhookConfig.sms_method = "POST";

        // Voice webhook
        webhookConfig.voice_url = `${baseUrl}/api/gianna/voice-webhook`;
        webhookConfig.voice_method = "POST";
      }

      if (Object.keys(webhookConfig).length > 0) {
        try {
          const formData = new URLSearchParams();
          Object.entries(webhookConfig).forEach(([key, value]) => {
            formData.append(
              key.charAt(0).toUpperCase() +
                key.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase()),
              value,
            );
          });

          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString(),
            },
          );
        } catch (err) {
          console.error("[Twilio API] Failed to update webhooks:", err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      settings: giannaSettings.get(phoneNumberSid),
      message: giannaEnabled
        ? `Gianna AI configured for ${giannaMode} mode`
        : "Gianna AI disabled for this number",
    });
  } catch (error) {
    console.error("[Configure API] Error:", error);
    return NextResponse.json(
      { error: "Failed to configure phone number" },
      { status: 500 },
    );
  }
}

// GET - Get Gianna settings for a phone number
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumberSid = searchParams.get("sid");

    if (!phoneNumberSid) {
      return NextResponse.json(
        { error: "Phone number SID required" },
        { status: 400 },
      );
    }

    const settings = giannaSettings.get(phoneNumberSid) || {
      giannaEnabled: false,
      giannaMode: "off",
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[Configure API] Error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 },
    );
  }
}
