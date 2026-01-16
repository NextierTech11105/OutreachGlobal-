import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callHistories, callRecordings } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const powerDialerId = searchParams.get("powerDialerId");
  const dialerContactId = searchParams.get("dialerContactId");
  const teamMemberId = searchParams.get("teamMemberId");

  try {
    const configured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);

    if (powerDialerId) {
      const calls = await db
        .select()
        .from(callHistories)
        .where(eq(callHistories.powerDialerId, powerDialerId))
        .orderBy(desc(callHistories.createdAt))
        .limit(100);

      return NextResponse.json({
        configured,
        data: calls,
        count: calls.length,
      });
    }

    if (dialerContactId) {
      const calls = await db
        .select()
        .from(callHistories)
        .where(eq(callHistories.dialerContactId, dialerContactId))
        .orderBy(desc(callHistories.createdAt));

      return NextResponse.json({
        configured,
        data: calls,
        count: calls.length,
      });
    }

    if (teamMemberId) {
      const calls = await db
        .select()
        .from(callHistories)
        .where(eq(callHistories.teamMemberId, teamMemberId))
        .orderBy(desc(callHistories.createdAt));

      return NextResponse.json({
        configured,
        data: calls,
        count: calls.length,
      });
    }

    return NextResponse.json({
      configured,
      message: "Calls API - provide powerDialerId, dialerContactId, or teamMemberId parameter",
      endpoints: {
        byDialer: "GET /api/calls?powerDialerId=xxx",
        byContact: "GET /api/calls?dialerContactId=xxx",
        byMember: "GET /api/calls?teamMemberId=xxx",
        initiate: "POST /api/calls { to, from, powerDialerId, dialerContactId }",
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
    const { to, from, powerDialerId, dialerContactId, dialerMode, teamMemberId } = body;

    if (!to) {
      return NextResponse.json(
        { error: "to phone number is required" },
        { status: 400 },
      );
    }

    if (!powerDialerId || !dialerContactId) {
      return NextResponse.json(
        { error: "powerDialerId and dialerContactId are required" },
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
      powerDialerId,
      dialerContactId,
      dialerMode: dialerMode || "manual",
      teamMemberId: teamMemberId || null,
      sid: twilioData.sid,
      duration: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
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
