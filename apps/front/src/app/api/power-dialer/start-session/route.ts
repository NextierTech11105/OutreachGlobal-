import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/power-dialer/start-session
 *
 * Start a power dialer session with a queue of leads.
 * Repeatable execution - leads are queued and called sequentially.
 */

interface DialerLead {
  id: string;
  phone: string;
  name: string;
  callbackId?: string;
}

interface DialerSession {
  id: string;
  teamId: string;
  leads: DialerLead[];
  currentIndex: number;
  status: "active" | "paused" | "completed";
  source: string;
  createdAt: Date;
}

// In-memory session store (replace with Redis in production)
const sessions = new Map<string, DialerSession>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, leads, source } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Team ID is required" },
        { status: 400 },
      );
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one lead is required" },
        { status: 400 },
      );
    }

    // Validate leads have phone numbers
    const validLeads = leads.filter((lead: DialerLead) => {
      const phone = lead.phone?.replace(/\D/g, "");
      return phone && phone.length >= 10;
    });

    if (validLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid phone numbers in lead list" },
        { status: 400 },
      );
    }

    // Create session
    const sessionId = uuidv4();
    const session: DialerSession = {
      id: sessionId,
      teamId,
      leads: validLeads.map((lead: DialerLead) => ({
        id: lead.id,
        phone: normalizePhone(lead.phone),
        name: lead.name || "Unknown",
        callbackId: lead.callbackId,
      })),
      currentIndex: 0,
      status: "active",
      source: source || "manual",
      createdAt: new Date(),
    };

    // Store session
    sessions.set(sessionId, session);

    // TODO: Store in database for persistence
    // await db.insert(dialerSessions).values(session);

    // Log session start
    console.log("Power Dialer session started:", {
      sessionId,
      teamId,
      leadCount: validLeads.length,
      source,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      leadCount: validLeads.length,
      status: "active",
    });
  } catch (error: any) {
    console.error("Power dialer start error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to start dialer session",
      },
      { status: 500 },
    );
  }
}

// GET - Retrieve session status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "Session ID is required" },
      { status: 400 },
    );
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      status: session.status,
      currentIndex: session.currentIndex,
      totalLeads: session.leads.length,
      currentLead: session.leads[session.currentIndex] || null,
      remainingLeads: session.leads.length - session.currentIndex,
    },
  });
}

// Normalize phone to consistent format
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits[0] === "1") {
    return `+${digits}`;
  }

  return `+${digits}`;
}
