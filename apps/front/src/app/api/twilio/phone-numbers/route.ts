import { NextRequest, NextResponse } from "next/server";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

// In-memory store for Gianna settings (would be database in production)
const giannaSettings = new Map<string, {
  giannaEnabled: boolean;
  giannaMode: "inbound" | "outbound" | "both" | "off";
  giannaAvatar?: string;
}>();

// GET - List all phone numbers from Twilio
export async function GET() {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      // Return empty array when Twilio not configured - NO MOCK DATA
      return NextResponse.json({
        numbers: [],
        error: "Twilio credentials not configured",
        configured: false,
      });
    }

    // Fetch from Twilio
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Twilio numbers");
    }

    const data = await response.json();

    // Map Twilio response and add Gianna settings
    const numbers = data.incoming_phone_numbers.map((num: any) => {
      const settings = giannaSettings.get(num.sid) || {
        giannaEnabled: false,
        giannaMode: "off",
      };

      return {
        sid: num.sid,
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name,
        capabilities: num.capabilities,
        status: num.status || "active",
        ...settings,
      };
    });

    return NextResponse.json({ numbers });
  } catch (error) {
    console.error("[Twilio API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 });
  }
}
