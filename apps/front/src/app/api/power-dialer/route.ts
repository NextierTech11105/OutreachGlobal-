import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { powerDialers, dialerContacts, callHistories } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");
  const id = searchParams.get("id");

  try {
    const configured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);

    if (id) {
      const [dialer] = await db
        .select()
        .from(powerDialers)
        .where(eq(powerDialers.id, id));

      if (!dialer) {
        return NextResponse.json(
          { error: "Power dialer not found" },
          { status: 404 },
        );
      }

      const contacts = await db
        .select()
        .from(dialerContacts)
        .where(eq(dialerContacts.dialerId, id));

      const callHistory = await db
        .select()
        .from(callHistories)
        .where(eq(callHistories.dialerId, id))
        .orderBy(desc(callHistories.createdAt))
        .limit(50);

      return NextResponse.json({
        configured,
        twilioNumber: TWILIO_PHONE_NUMBER || null,
        dialer,
        contacts,
        callHistory,
        stats: {
          totalContacts: contacts.length,
          pending: contacts.filter((c) => c.status === "pending").length,
          completed: contacts.filter((c) => c.status === "completed").length,
          noAnswer: contacts.filter((c) => c.status === "no_answer").length,
        },
      });
    }

    if (teamId) {
      const dialers = await db
        .select()
        .from(powerDialers)
        .where(eq(powerDialers.teamId, teamId))
        .orderBy(desc(powerDialers.createdAt));

      return NextResponse.json({
        configured,
        twilioNumber: TWILIO_PHONE_NUMBER || null,
        data: dialers,
        count: dialers.length,
      });
    }

    return NextResponse.json({
      configured,
      twilioNumber: TWILIO_PHONE_NUMBER || null,
      message: "Power Dialer API - provide teamId or id parameter",
      endpoints: {
        list: "GET /api/power-dialer?teamId=xxx",
        get: "GET /api/power-dialer?id=xxx",
        create: "POST /api/power-dialer { teamId, name, contacts }",
        call: "POST /api/power-dialer/call { dialerId, contactId }",
      },
    });
  } catch (error) {
    console.error("Power dialer error:", error);
    return NextResponse.json(
      { error: "Failed to get power dialer data", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, name, leadIds } = body;

    if (!teamId || !name) {
      return NextResponse.json(
        { error: "teamId and name are required" },
        { status: 400 },
      );
    }

    const id = `pd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const [newDialer] = await db
      .insert(powerDialers)
      .values({
        id,
        teamId,
        name,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newDialer, { status: 201 });
  } catch (error) {
    console.error("Create power dialer error:", error);
    return NextResponse.json(
      { error: "Failed to create power dialer", details: String(error) },
      { status: 500 },
    );
  }
}
