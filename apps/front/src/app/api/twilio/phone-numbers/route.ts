import { NextRequest, NextResponse } from "next/server";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

// In-memory store for Gianna settings (would be database in production)
const giannaSettings = new Map<
  string,
  {
    giannaEnabled: boolean;
    giannaMode: "inbound" | "outbound" | "both" | "off";
    giannaAvatar?: string;
  }
>();

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
      },
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
    return NextResponse.json(
      { error: "Failed to fetch phone numbers" },
      { status: 500 },
    );
  }
}

/**
 * POST - Search available numbers OR purchase a number
 * TWILIO = VOICE/PHONE CENTER ONLY (SignalHouse handles SMS)
 *
 * Actions:
 * - search: Find available phone numbers by area code/region
 * - purchase: Buy a specific phone number for voice calls
 */
export async function POST(request: NextRequest) {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { action } = body;

    const authHeader = `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`;

    // ═══════════════════════════════════════════════════════════════
    // SEARCH AVAILABLE NUMBERS (for phone center)
    // ═══════════════════════════════════════════════════════════════
    if (action === "search") {
      const { areaCode, state, country = "US", limit = 20 } = body;

      // Build search URL
      let searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/${country}/Local.json?`;
      const params = new URLSearchParams();

      if (areaCode) params.append("AreaCode", areaCode);
      if (state) params.append("InRegion", state);
      params.append("VoiceEnabled", "true"); // VOICE ONLY - SignalHouse handles SMS
      params.append("PageSize", String(limit));

      searchUrl += params.toString();

      const response = await fetch(searchUrl, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to search numbers");
      }

      const data = await response.json();

      // Map to clean format
      const availableNumbers = data.available_phone_numbers.map((num: any) => ({
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name,
        locality: num.locality,
        region: num.region,
        postalCode: num.postal_code,
        capabilities: {
          voice: num.capabilities?.voice || true,
          sms: num.capabilities?.sms || false, // We don't use Twilio SMS
          mms: num.capabilities?.mms || false,
        },
        monthlyPrice: 1.15, // Standard Twilio local number price
      }));

      return NextResponse.json({
        success: true,
        available: availableNumbers,
        count: availableNumbers.length,
        note: "These numbers are for VOICE/PHONE CENTER only. Use SignalHouse for SMS.",
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE NUMBER (for phone center dialer)
    // ═══════════════════════════════════════════════════════════════
    if (action === "purchase") {
      const { phoneNumber, friendlyName, voiceUrl, voiceFallbackUrl } = body;

      if (!phoneNumber) {
        return NextResponse.json(
          { error: "phoneNumber is required" },
          { status: 400 },
        );
      }

      // Purchase the number
      const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;

      const purchaseParams = new URLSearchParams();
      purchaseParams.append("PhoneNumber", phoneNumber);
      if (friendlyName) purchaseParams.append("FriendlyName", friendlyName);
      if (voiceUrl) purchaseParams.append("VoiceUrl", voiceUrl);
      if (voiceFallbackUrl)
        purchaseParams.append("VoiceFallbackUrl", voiceFallbackUrl);

      const response = await fetch(purchaseUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: purchaseParams.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to purchase number");
      }

      const data = await response.json();

      // Store initial Gianna settings
      giannaSettings.set(data.sid, {
        giannaEnabled: false,
        giannaMode: "off",
      });

      return NextResponse.json({
        success: true,
        number: {
          sid: data.sid,
          phoneNumber: data.phone_number,
          friendlyName: data.friendly_name,
          capabilities: data.capabilities,
          status: data.status,
        },
        message:
          "Number purchased for VOICE/PHONE CENTER. Configure webhooks for dialer.",
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // RELEASE NUMBER
    // ═══════════════════════════════════════════════════════════════
    if (action === "release") {
      const { sid } = body;

      if (!sid) {
        return NextResponse.json({ error: "sid is required" }, { status: 400 });
      }

      const releaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${sid}.json`;

      const response = await fetch(releaseUrl, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json();
        throw new Error(error.message || "Failed to release number");
      }

      // Remove Gianna settings
      giannaSettings.delete(sid);

      return NextResponse.json({
        success: true,
        releasedSid: sid,
        message: "Number released from account",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Twilio Phone Numbers] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 },
    );
  }
}
