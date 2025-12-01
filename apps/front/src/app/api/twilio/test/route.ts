import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { accountSid, authToken } = await request.json();

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Account SID and Auth Token are required" },
        { status: 400 }
      );
    }

    // Test connection by fetching account info from Twilio
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.message || "Invalid credentials or connection failed",
          code: errorData.code
        },
        { status: response.status }
      );
    }

    const account = await response.json();

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      account: {
        sid: account.sid,
        friendlyName: account.friendly_name,
        status: account.status,
        type: account.type,
      },
    });
  } catch (error: unknown) {
    console.error("Twilio test connection error:", error);
    const message = error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
