import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dialerSessions, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get("teamId");
  const dialerId = searchParams.get("dialerId");

  try {
    // Check Twilio configuration
    const configured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);

    if (dialerId) {
      const [dialer] = await db
        .select()
        .from(dialerSessions)
        .where(eq(dialerSessions.id, dialerId));

      if (!dialer) {
        return NextResponse.json(
          { error: "Dialer not found" },
          { status: 404 },
        );
      }

      // Get leads that are in this session
      const sessionLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.dialerSessionId, dialerId));

      return NextResponse.json({
        configured,
        dialer,
        contacts: sessionLeads,
        contactCount: sessionLeads.length,
      });
    }

    if (teamId) {
      const dialers = await db
        .select()
        .from(dialerSessions)
        .where(eq(dialerSessions.teamId, teamId))
        .orderBy(desc(dialerSessions.createdAt));

      return NextResponse.json({
        configured,
        data: dialers,
        count: dialers.length,
      });
    }

    return NextResponse.json({
      configured,
      message: "Provide teamId or dialerId parameter",
    });
  } catch (error) {
    console.error("Get dialer error:", error);
    return NextResponse.json(
      { error: "Failed to get dialer data", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, name, contacts } = body;

    if (!teamId || !name) {
      return NextResponse.json(
        { error: "teamId and name are required" },
        { status: 400 },
      );
    }

    const id = `dial_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

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

    // Add contacts if provided
    if (contacts && Array.isArray(contacts)) {
      for (const contact of contacts) {
        await db.insert(dialerContacts).values({
          id: `dc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          dialerId: id,
          leadId: contact.leadId,
          phone: contact.phone,
          status: "pending",
          createdAt: new Date(),
        });
      }
    }

    return NextResponse.json(newDialer, { status: 201 });
  } catch (error) {
    console.error("Create dialer error:", error);
    return NextResponse.json(
      { error: "Failed to create dialer", details: String(error) },
      { status: 500 },
    );
  }
}
