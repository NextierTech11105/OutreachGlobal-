import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appState, callHistories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/power-dialer/action
 *
 * Control power dialer session: pause, resume, skip, end
 *
 * Uses appState table for session persistence.
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
  createdAt: string;
}

// Helper to get session from database
async function getSession(sessionId: string): Promise<DialerSession | null> {
  const key = `power_dialer_session:${sessionId}`;
  const [state] = await db
    .select()
    .from(appState)
    .where(eq(appState.key, key))
    .limit(1);

  return state?.value as DialerSession | null;
}

// Helper to save session to database
async function saveSession(session: DialerSession): Promise<void> {
  const key = `power_dialer_session:${session.id}`;

  const [existing] = await db
    .select()
    .from(appState)
    .where(eq(appState.key, key))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: session, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId: session.teamId,
      key,
      value: session,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, callResult } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { success: false, error: "Session ID and action are required" },
        { status: 400 }
      );
    }

    // Fetch session from database
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "pause":
        session.status = "paused";
        break;

      case "resume":
        session.status = "active";
        break;

      case "skip":
        // Log skip result if provided
        if (callResult) {
          await logCallResult(session, callResult);
        }
        // Move to next lead
        session.currentIndex++;
        if (session.currentIndex >= session.leads.length) {
          session.status = "completed";
        }
        break;

      case "next":
        // Log call result and move to next
        if (callResult) {
          await logCallResult(session, callResult);
        }
        session.currentIndex++;
        if (session.currentIndex >= session.leads.length) {
          session.status = "completed";
        }
        break;

      case "end":
        session.status = "completed";
        break;

      case "disposition":
        // Log disposition without advancing
        if (callResult) {
          await logCallResult(session, callResult);
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Save updated session to database
    await saveSession(session);

    // Get current/next lead info
    const currentLead =
      session.currentIndex < session.leads.length
        ? session.leads[session.currentIndex]
        : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        currentIndex: session.currentIndex,
        totalLeads: session.leads.length,
        currentLead,
        remainingLeads: session.leads.length - session.currentIndex,
        progress: Math.round(
          (session.currentIndex / session.leads.length) * 100
        ),
      },
    });
  } catch (error: any) {
    console.error("Power dialer action error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process action" },
      { status: 500 }
    );
  }
}

// Log call result for the current lead
async function logCallResult(
  session: DialerSession,
  result: {
    outcome: string;
    duration?: number;
    notes?: string;
    scheduleCallback?: Date;
  }
) {
  const lead = session.leads[session.currentIndex];
  if (!lead) return;

  // Store call result in appState as a log entry
  const logKey = `call_log:${session.id}:${lead.id}:${Date.now()}`;
  await db.insert(appState).values({
    id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teamId: session.teamId,
    key: logKey,
    value: {
      leadId: lead.id,
      sessionId: session.id,
      outcome: result.outcome,
      duration: result.duration,
      notes: result.notes,
      callbackScheduled: result.scheduleCallback,
      createdAt: new Date().toISOString(),
    },
  });

  console.log("Call result logged:", {
    sessionId: session.id,
    leadId: lead.id,
    ...result,
  });

  // If callback scheduled, create callback entry
  if (result.scheduleCallback) {
    const callbackKey = `callback:${lead.id}:${Date.now()}`;
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId: session.teamId,
      key: callbackKey,
      value: {
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        scheduledFor: result.scheduleCallback,
        sessionId: session.id,
        createdAt: new Date().toISOString(),
      },
    });
  }
}
