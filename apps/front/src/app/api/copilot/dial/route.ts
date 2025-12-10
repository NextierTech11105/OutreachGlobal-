import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, callLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GIANNA COPILOT DIAL API
 *
 * Auto-dial session management for Gianna AI Copilot
 * - Initiates outbound calls via SignalHouse/Twilio
 * - Tracks call sessions and dispositions
 * - Human-in-the-loop feedback integration
 */

interface DialRequest {
  sessionId: string;
  leadId: string;
  phone: string;
  workspaceId: string;
  callerId?: string; // The number Gianna uses (assigned from initial SMS)
}

interface DialSession {
  id: string;
  leadId: string;
  status: "initiated" | "ringing" | "connected" | "completed" | "failed" | "no_answer";
  startTime: string;
  endTime?: string;
  duration?: number;
  disposition?: string;
  recording_url?: string;
  transcript?: string;
  ai_summary?: string;
}

// Active sessions stored in memory (production would use Redis)
const activeSessions = new Map<string, DialSession>();

// POST - Initiate a call
export async function POST(request: NextRequest) {
  try {
    const body: DialRequest = await request.json();
    const { sessionId, leadId, phone, workspaceId, callerId } = body;

    if (!sessionId || !leadId || !phone) {
      return NextResponse.json(
        { error: "sessionId, leadId, and phone are required" },
        { status: 400 }
      );
    }

    // Create dial session
    const dialSession: DialSession = {
      id: sessionId,
      leadId,
      status: "initiated",
      startTime: new Date().toISOString(),
    };

    activeSessions.set(sessionId, dialSession);

    // Get lead details for context
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    // In production, this would call SignalHouse/Twilio API
    // For now, simulate the call initiation
    console.log(`[GiannaCopilot] Initiating call to ${phone} for lead ${leadId}`);

    // Simulate call connection after 2 seconds
    setTimeout(() => {
      const session = activeSessions.get(sessionId);
      if (session && session.status === "initiated") {
        session.status = "ringing";
        activeSessions.set(sessionId, session);
      }
    }, 2000);

    // Log the call attempt
    try {
      await db.insert(callLogs).values({
        id: crypto.randomUUID(),
        leadId,
        direction: "outbound",
        status: "initiated",
        fromNumber: callerId || process.env.SIGNALHOUSE_PHONE_NUMBER || "",
        toNumber: phone,
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (dbError) {
      console.log("[GiannaCopilot] Call log table may not exist yet:", dbError);
    }

    return NextResponse.json({
      success: true,
      session: dialSession,
      lead: lead ? {
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
      } : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Dial failed";
    console.error("[GiannaCopilot] Dial error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update call status/disposition
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, status, disposition, duration, ai_summary, transcript, recording_url } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Update session
    if (status) session.status = status;
    if (disposition) session.disposition = disposition;
    if (duration !== undefined) session.duration = duration;
    if (ai_summary) session.ai_summary = ai_summary;
    if (transcript) session.transcript = transcript;
    if (recording_url) session.recording_url = recording_url;

    if (status === "completed" || status === "failed" || status === "no_answer") {
      session.endTime = new Date().toISOString();
    }

    activeSessions.set(sessionId, session);

    // Update lead with call outcome
    if (disposition && session.leadId) {
      const updateData: Record<string, unknown> = {
        lastContactDate: new Date(),
        updatedAt: new Date(),
      };

      // Update status based on disposition
      if (disposition === "appointment_set") {
        updateData.status = "qualified";
      } else if (disposition === "not_interested") {
        updateData.status = "lost";
      } else if (disposition === "callback_requested") {
        updateData.revisitAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
        updateData.revisitReason = "callback";
      }

      await db
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, session.leadId));
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    console.error("[GiannaCopilot] Update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      // Return all active sessions summary
      const sessions = Array.from(activeSessions.values());
      return NextResponse.json({
        success: true,
        activeSessions: sessions.filter(s =>
          s.status !== "completed" && s.status !== "failed"
        ).length,
        totalSessions: sessions.length,
        sessions: sessions.slice(-10), // Last 10
      });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Query failed";
    console.error("[GiannaCopilot] Query error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - End/cancel session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = activeSessions.get(sessionId);
    if (session) {
      session.status = "completed";
      session.endTime = new Date().toISOString();
      session.disposition = session.disposition || "cancelled";
      activeSessions.set(sessionId, session);
    }

    return NextResponse.json({
      success: true,
      message: "Session ended",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    console.error("[GiannaCopilot] Delete error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
