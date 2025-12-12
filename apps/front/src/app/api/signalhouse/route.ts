import { NextRequest, NextResponse } from "next/server";

// SignalHouse API - Modern SMS/MMS Provider (10DLC)
// https://signalhouse.io
// Up to 80% cheaper than Twilio

const SIGNALHOUSE_API_KEY = process.env.SIGNALHOUSE_API_KEY;
const SIGNALHOUSE_ACCOUNT_SID = process.env.SIGNALHOUSE_ACCOUNT_SID;
const SIGNALHOUSE_AUTH_TOKEN = process.env.SIGNALHOUSE_AUTH_TOKEN;
const SIGNALHOUSE_BASE_URL =
  process.env.SIGNALHOUSE_BASE_URL || "https://api.signalhouse.io/v1";

// Check if SignalHouse is configured
function isConfigured(): boolean {
  return !!(
    SIGNALHOUSE_API_KEY ||
    (SIGNALHOUSE_ACCOUNT_SID && SIGNALHOUSE_AUTH_TOKEN)
  );
}

function getAuthHeaders(): Record<string, string> {
  if (SIGNALHOUSE_API_KEY) {
    return {
      Authorization: `Bearer ${SIGNALHOUSE_API_KEY}`,
      "Content-Type": "application/json",
    };
  }
  if (SIGNALHOUSE_ACCOUNT_SID && SIGNALHOUSE_AUTH_TOKEN) {
    return {
      Authorization: `Basic ${Buffer.from(`${SIGNALHOUSE_ACCOUNT_SID}:${SIGNALHOUSE_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/json",
    };
  }
  return { "Content-Type": "application/json" };
}

// GET - Check SignalHouse connection status and list phone numbers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "status";

  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "SignalHouse API not configured. Set SIGNALHOUSE_API_KEY or SIGNALHOUSE_ACCOUNT_SID + SIGNALHOUSE_AUTH_TOKEN",
      },
      { status: 503 },
    );
  }

  try {
    if (action === "numbers") {
      // List available phone numbers
      const response = await fetch(`${SIGNALHOUSE_BASE_URL}/PhoneNumbers`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: `SignalHouse error: ${err}` },
          { status: response.status },
        );
      }

      const data = await response.json();
      return NextResponse.json({
        success: true,
        numbers: data.phone_numbers || data.data || [],
      });
    }

    // Default: status check
    return NextResponse.json({
      configured: true,
      provider: "SignalHouse",
      baseUrl: SIGNALHOUSE_BASE_URL,
      features: ["sms", "mms", "10dlc", "two-way", "phone-verify"],
    });
  } catch (error: any) {
    console.error("[SignalHouse] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Send SMS, provision number, or verify phone
export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "SignalHouse API not configured",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "send_sms": {
        // Send SMS message
        const { to, from, message, campaignId } = body;
        if (!to || !message) {
          return NextResponse.json(
            { error: "to and message required" },
            { status: 400 },
          );
        }

        console.log(
          `[SignalHouse] Sending SMS to ${to}: ${message.substring(0, 50)}...`,
        );

        const response = await fetch(`${SIGNALHOUSE_BASE_URL}/Messages`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            to,
            from: from || process.env.SIGNALHOUSE_DEFAULT_NUMBER,
            body: message,
            campaign_id: campaignId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(
            { error: data.message || "Failed to send SMS" },
            { status: response.status },
          );
        }

        return NextResponse.json({
          success: true,
          messageId: data.sid || data.id,
          status: data.status,
        });
      }

      case "provision_number": {
        // Provision a new phone number for campaign
        const { areaCode, campaignName, capabilities } = body;

        console.log(
          `[SignalHouse] Provisioning number for ${campaignName} (area code: ${areaCode || "any"})`,
        );

        // Search available numbers
        const searchResponse = await fetch(
          `${SIGNALHOUSE_BASE_URL}/AvailablePhoneNumbers?area_code=${areaCode || ""}&capabilities=${capabilities || "sms,mms"}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          },
        );

        if (!searchResponse.ok) {
          const err = await searchResponse.text();
          return NextResponse.json(
            { error: `Failed to search numbers: ${err}` },
            { status: searchResponse.status },
          );
        }

        const available = await searchResponse.json();
        const numbers =
          available.available_phone_numbers || available.data || [];

        if (numbers.length === 0) {
          return NextResponse.json(
            { error: "No numbers available in that area code" },
            { status: 404 },
          );
        }

        // Purchase the first available number
        const phoneNumber = numbers[0].phone_number || numbers[0].number;
        const purchaseResponse = await fetch(
          `${SIGNALHOUSE_BASE_URL}/IncomingPhoneNumbers`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              phone_number: phoneNumber,
              friendly_name: campaignName || "Nextier Campaign",
              sms_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://api.nextierglobal.ai"}/api/webhooks/signalhouse/sms`,
              voice_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://api.nextierglobal.ai"}/api/webhooks/signalhouse/voice`,
            }),
          },
        );

        if (!purchaseResponse.ok) {
          const err = await purchaseResponse.text();
          return NextResponse.json(
            { error: `Failed to provision number: ${err}` },
            { status: purchaseResponse.status },
          );
        }

        const provisioned = await purchaseResponse.json();

        return NextResponse.json({
          success: true,
          phoneNumber: provisioned.phone_number || phoneNumber,
          sid: provisioned.sid || provisioned.id,
          friendlyName: campaignName,
        });
      }

      case "verify_phone": {
        // Verify/lookup a phone number (carrier, type) - SignalHouse handles compliance
        const { phone } = body;
        if (!phone) {
          return NextResponse.json(
            { error: "phone required" },
            { status: 400 },
          );
        }

        console.log(`[SignalHouse] Verifying phone: ${phone}`);

        const response = await fetch(
          `${SIGNALHOUSE_BASE_URL}/Lookups/${encodeURIComponent(phone)}?type=carrier`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          },
        );

        if (!response.ok) {
          const err = await response.text();
          return NextResponse.json(
            { error: `Lookup failed: ${err}` },
            { status: response.status },
          );
        }

        const lookup = await response.json();

        return NextResponse.json({
          success: true,
          phone,
          valid: lookup.valid !== false,
          carrier: lookup.carrier?.name || lookup.carrier_name,
          type: lookup.carrier?.type || lookup.line_type, // mobile, landline, voip
        });
      }

      case "batch_verify": {
        // Batch verify multiple phone numbers
        const { phones } = body;
        if (!phones || !Array.isArray(phones) || phones.length === 0) {
          return NextResponse.json(
            { error: "phones array required" },
            { status: 400 },
          );
        }

        console.log(`[SignalHouse] Batch verifying ${phones.length} phones`);

        const results = await Promise.all(
          phones.slice(0, 100).map(async (phone: string) => {
            try {
              const response = await fetch(
                `${SIGNALHOUSE_BASE_URL}/Lookups/${encodeURIComponent(phone)}?type=carrier`,
                {
                  method: "GET",
                  headers: getAuthHeaders(),
                },
              );

              if (!response.ok) {
                return { phone, valid: false, error: "lookup_failed" };
              }

              const lookup = await response.json();
              return {
                phone,
                valid: lookup.valid !== false,
                type: lookup.carrier?.type || lookup.line_type,
                mobile:
                  lookup.carrier?.type === "mobile" ||
                  lookup.line_type === "mobile",
              };
            } catch {
              return { phone, valid: false, error: "exception" };
            }
          }),
        );

        const valid = results.filter((r) => r.valid);
        const mobile = results.filter((r) => r.mobile);

        return NextResponse.json({
          success: true,
          total: phones.length,
          verified: results.length,
          valid: valid.length,
          mobile: mobile.length,
          results,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error: any) {
    console.error("[SignalHouse] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
