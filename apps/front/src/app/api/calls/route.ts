import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callHistories, callRecordings } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");
  const leadId = searchParams.get("leadId");
  const dialerId = searchParams.get("dialerId");

  try {
    const configured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);

    const query = db
      .select()
      .from(callHistories)
      .orderBy(desc(callHistories.createdAt));

    if (teamId) {
      const calls = await db
        .select()
        .from(callHistories)
        .where(eq(callHistories.teamId, teamId))
        .orderBy(desc(callHistories.createdAt))
        .limit(100);

      return NextResponse.json({
        configured,
        data: calls,
        count: calls.length,
      });
    }

    if (leadId) {
      const calls = await db
        .select()
        .from(callHistories)
        .where(eq(callHistories.leadId, leadId))
        .orderBy(desc(callHistories.createdAt));

      return NextResponse.json({
        configured,
        data: calls,
        count: calls.length,
      });
    }

    if (dialerId) {
      const calls = await db
        .select()
        .from(callHistories)
        .where(eq(callHistories.dialerId, dialerId))
        .orderBy(desc(callHistories.createdAt));

      return NextResponse.json({
        configured,
        data: calls,
        count: calls.length,
      });
    }

    return NextResponse.json({
      configured,
      message: "Calls API - provide teamId, leadId, or dialerId parameter",
      endpoints: {
        byTeam: "GET /api/calls?teamId=xxx",
        byLead: "GET /api/calls?leadId=xxx",
        byDialer: "GET /api/calls?dialerId=xxx",
        initiate: "POST /api/calls { to, from, leadId }",
      },
    });
  } catch (error) {
    console.error("Get calls error:", error);
    return NextResponse.json(
      { error: "Failed to get calls", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: "Twilio not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { to, from, teamId, leadId, dialerId, userId } = body;

    if (!to) {
      return NextResponse.json(
        { error: "to phone number is required" },
        { status: 400 },
      );
    }

    // Initiate call via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", from || process.env.TWILIO_PHONE_NUMBER || "");
    formData.append(
      "Url",
      `${process.env.NEXT_PUBLIC_APP_URL || "https://monkfish-app-mb7h3.ondigitalocean.app"}/api/twilio/twiml`,
    );

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      return NextResponse.json(
        { error: "Twilio call failed", details: twilioData },
        { status: 500 },
      );
    }

    // Log the call
    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    await db.insert(callHistories).values({
      id: callId,
      teamId: teamId || "",
      leadId: leadId || null,
      dialerId: dialerId || null,
      userId: userId || null,
      direction: "outbound",
      fromNumber: from || process.env.TWILIO_PHONE_NUMBER || "",
      toNumber: to,
      status: "initiated",
      twilioSid: twilioData.sid,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      callId,
      twilioSid: twilioData.sid,
      status: twilioData.status,
    });
  } catch (error) {
    console.error("Initiate call error:", error);
    return NextResponse.json(
      { error: "Failed to initiate call", details: String(error) },
      { status: 500 },
    );
  }
}
