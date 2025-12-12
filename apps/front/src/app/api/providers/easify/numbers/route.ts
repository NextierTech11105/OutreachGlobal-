import { NextRequest, NextResponse } from "next/server";

// Easify API configuration
const EASIFY_API_KEY = process.env.EASIFY_API_KEY || "";
const EASIFY_API_URL = process.env.EASIFY_API_URL || "https://api.easify.io/v1";

interface EasifyPhoneNumber {
  id: string;
  phoneNumber: string;
  label?: string;
  friendlyName?: string;
  status: "active" | "inactive" | "pending";
  capabilities: {
    sms: boolean;
    voice: boolean;
    mms: boolean;
  };
  giannaEnabled?: boolean;
  giannaMode?: "inbound" | "outbound" | "both" | "off";
  giannaAvatar?: string;
  createdAt?: string;
}

// In-memory store for Gianna settings (would be database in production)
const giannaSettings = new Map<
  string,
  {
    giannaEnabled: boolean;
    giannaMode: "inbound" | "outbound" | "both" | "off";
    giannaAvatar?: string;
  }
>();

// GET - Fetch all Easify phone numbers
export async function GET() {
  try {
    // If no API key, return demo data
    if (!EASIFY_API_KEY) {
      console.log("[Easify API] No API key configured, returning demo data");
      return NextResponse.json({
        numbers: [
          {
            id: "easify-demo-1",
            phoneNumber: "+18885551001",
            label: "Main Dialer Line",
            friendlyName: "Easify Main",
            status: "active",
            capabilities: { sms: true, voice: true, mms: false },
            giannaEnabled: true,
            giannaMode: "both",
            giannaAvatar: "gianna-default",
          },
          {
            id: "easify-demo-2",
            phoneNumber: "+18885551002",
            label: "Inbound Response",
            friendlyName: "Easify Inbound",
            status: "active",
            capabilities: { sms: true, voice: true, mms: false },
            giannaEnabled: true,
            giannaMode: "inbound",
            giannaAvatar: "gianna-default",
          },
          {
            id: "easify-demo-3",
            phoneNumber: "+18885551003",
            label: "Outbound Campaigns",
            friendlyName: "Easify Outbound",
            status: "active",
            capabilities: { sms: true, voice: true, mms: false },
            giannaEnabled: false,
            giannaMode: "off",
          },
        ],
        provider: "easify",
        demo: true,
      });
    }

    // Fetch from Easify API
    const response = await fetch(`${EASIFY_API_URL}/phone-numbers`, {
      headers: {
        Authorization: `Bearer ${EASIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Easify API] Failed to fetch numbers:", error);
      return NextResponse.json(
        { error: "Failed to fetch Easify numbers" },
        { status: 500 },
      );
    }

    const data = await response.json();

    // Map Easify response to our format and merge with Gianna settings
    const numbers: EasifyPhoneNumber[] = (
      data.phoneNumbers ||
      data.numbers ||
      []
    ).map((num: any) => {
      const settings = giannaSettings.get(num.id) || {
        giannaEnabled: false,
        giannaMode: "off" as const,
      };

      return {
        id: num.id || num.sid,
        phoneNumber: num.phoneNumber || num.phone_number,
        label: num.label || num.friendly_name,
        friendlyName: num.friendlyName || num.friendly_name || num.label,
        status: num.status || "active",
        capabilities: {
          sms: num.capabilities?.sms ?? true,
          voice: num.capabilities?.voice ?? true,
          mms: num.capabilities?.mms ?? false,
        },
        ...settings,
        createdAt: num.createdAt || num.created_at,
      };
    });

    return NextResponse.json({
      numbers,
      provider: "easify",
      count: numbers.length,
    });
  } catch (error) {
    console.error("[Easify API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Easify numbers" },
      { status: 500 },
    );
  }
}

// POST - Update Gianna settings for an Easify number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneId, giannaEnabled, giannaMode, giannaAvatar } = body;

    if (!phoneId) {
      return NextResponse.json({ error: "Phone ID required" }, { status: 400 });
    }

    // Store Gianna settings
    giannaSettings.set(phoneId, {
      giannaEnabled: giannaEnabled ?? false,
      giannaMode: giannaMode ?? "off",
      giannaAvatar: giannaAvatar,
    });

    // If Gianna is enabled, configure webhooks on Easify
    if (giannaEnabled && EASIFY_API_KEY) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://monkfish-app-mb7h3.ondigitalocean.app";

      try {
        await fetch(`${EASIFY_API_URL}/phone-numbers/${phoneId}/webhooks`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${EASIFY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sms_webhook_url: `${baseUrl}/api/gianna/sms-webhook`,
            voice_webhook_url: `${baseUrl}/api/gianna/voice-webhook`,
            sms_method: "POST",
            voice_method: "POST",
          }),
        });
      } catch (err) {
        console.error("[Easify API] Failed to update webhooks:", err);
      }
    }

    return NextResponse.json({
      success: true,
      phoneId,
      settings: giannaSettings.get(phoneId),
    });
  } catch (error) {
    console.error("[Easify API] Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
