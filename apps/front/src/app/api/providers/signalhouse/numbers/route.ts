import { NextRequest, NextResponse } from "next/server";

// SignalHouse API configuration
const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY || "";
const SIGNALHOUSE_API_URL =
  process.env.SIGNALHOUSE_API_URL || "https://api.signalhouse.io/v1";

interface SignalHousePhoneNumber {
  id: string;
  phoneNumber: string;
  label?: string;
  friendlyName?: string;
  status: "active" | "inactive" | "pending";
  capabilities: {
    sms: boolean;
    voice: boolean;
    mms: boolean;
    bulkSms: boolean;
  };
  giannaEnabled?: boolean;
  giannaMode?: "inbound" | "outbound" | "both" | "off";
  giannaAvatar?: string;
  dailyLimit?: number;
  usedToday?: number;
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

// GET - Fetch all SignalHouse phone numbers
export async function GET() {
  try {
    // If no API key, return demo data
    if (!SIGNALHOUSE_API_KEY) {
      console.log(
        "[SignalHouse API] No API key configured, returning demo data",
      );
      return NextResponse.json({
        numbers: [
          {
            id: "signalhouse-demo-1",
            phoneNumber: "+18885552001",
            label: "Bulk SMS Pool A",
            friendlyName: "SignalHouse Bulk A",
            status: "active",
            capabilities: {
              sms: true,
              voice: false,
              mms: false,
              bulkSms: true,
            },
            giannaEnabled: false,
            giannaMode: "off",
            dailyLimit: 10000,
            usedToday: 1250,
          },
          {
            id: "signalhouse-demo-2",
            phoneNumber: "+18885552002",
            label: "Bulk SMS Pool B",
            friendlyName: "SignalHouse Bulk B",
            status: "active",
            capabilities: {
              sms: true,
              voice: false,
              mms: false,
              bulkSms: true,
            },
            giannaEnabled: false,
            giannaMode: "off",
            dailyLimit: 10000,
            usedToday: 3400,
          },
          {
            id: "signalhouse-demo-3",
            phoneNumber: "+18885552003",
            label: "Response Line",
            friendlyName: "SignalHouse Response",
            status: "active",
            capabilities: {
              sms: true,
              voice: false,
              mms: false,
              bulkSms: true,
            },
            giannaEnabled: true,
            giannaMode: "inbound",
            giannaAvatar: "gianna-default",
            dailyLimit: 5000,
            usedToday: 120,
          },
        ],
        provider: "signalhouse",
        demo: true,
      });
    }

    // Fetch from SignalHouse API
    const response = await fetch(`${SIGNALHOUSE_API_URL}/phone-numbers`, {
      headers: {
        Authorization: `Bearer ${SIGNALHOUSE_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[SignalHouse API] Failed to fetch numbers:", error);
      return NextResponse.json(
        { error: "Failed to fetch SignalHouse numbers" },
        { status: 500 },
      );
    }

    const data = await response.json();

    // Map SignalHouse response to our format and merge with Gianna settings
    const numbers: SignalHousePhoneNumber[] = (
      data.phoneNumbers ||
      data.numbers ||
      data.data ||
      []
    ).map((num: any) => {
      const settings = giannaSettings.get(num.id) || {
        giannaEnabled: false,
        giannaMode: "off" as const,
      };

      return {
        id: num.id || num.sid || num.phone_number_id,
        phoneNumber: num.phoneNumber || num.phone_number || num.number,
        label: num.label || num.name || num.friendly_name,
        friendlyName:
          num.friendlyName || num.friendly_name || num.label || num.name,
        status: num.status || "active",
        capabilities: {
          sms: true,
          voice: false, // SignalHouse is SMS-only
          mms: num.capabilities?.mms ?? false,
          bulkSms: true, // SignalHouse specializes in bulk SMS
        },
        ...settings,
        dailyLimit: num.dailyLimit || num.daily_limit || 10000,
        usedToday: num.usedToday || num.messages_sent_today || 0,
        createdAt: num.createdAt || num.created_at,
      };
    });

    return NextResponse.json({
      numbers,
      provider: "signalhouse",
      count: numbers.length,
    });
  } catch (error) {
    console.error("[SignalHouse API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SignalHouse numbers" },
      { status: 500 },
    );
  }
}

// POST - Update Gianna settings for a SignalHouse number
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

    // If Gianna is enabled, configure webhooks on SignalHouse
    if (giannaEnabled && SIGNALHOUSE_API_KEY) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://monkfish-app-mb7h3.ondigitalocean.app";

      try {
        await fetch(`${SIGNALHOUSE_API_URL}/webhooks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SIGNALHOUSE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone_number_id: phoneId,
            inbound_sms_url: `${baseUrl}/api/gianna/sms-webhook`,
            delivery_status_url: `${baseUrl}/api/signalhouse/delivery-status`,
          }),
        });
      } catch (err) {
        console.error("[SignalHouse API] Failed to update webhooks:", err);
      }
    }

    return NextResponse.json({
      success: true,
      phoneId,
      settings: giannaSettings.get(phoneId),
    });
  } catch (error) {
    console.error("[SignalHouse API] Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
