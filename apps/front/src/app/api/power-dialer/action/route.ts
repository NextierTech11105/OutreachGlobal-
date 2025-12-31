import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/power-dialer/action
 *
 * Control power dialer session: pause, resume, skip, end
 */

// In-memory session store (shared with start-session - in production use Redis)
const sessions = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, callResult } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { success: false, error: 'Session ID and action are required' },
        { status: 400 }
      );
    }

    // TODO: Fetch from database in production
    const session = sessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'pause':
        session.status = 'paused';
        break;

      case 'resume':
        session.status = 'active';
        break;

      case 'skip':
        // Log skip result if provided
        if (callResult) {
          await logCallResult(session, callResult);
        }
        // Move to next lead
        session.currentIndex++;
        if (session.currentIndex >= session.leads.length) {
          session.status = 'completed';
        }
        break;

      case 'next':
        // Log call result and move to next
        if (callResult) {
          await logCallResult(session, callResult);
        }
        session.currentIndex++;
        if (session.currentIndex >= session.leads.length) {
          session.status = 'completed';
        }
        break;

      case 'end':
        session.status = 'completed';
        break;

      case 'disposition':
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

    // Update session
    sessions.set(sessionId, session);

    // Get current/next lead info
    const currentLead = session.currentIndex < session.leads.length
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
        progress: Math.round((session.currentIndex / session.leads.length) * 100),
      },
    });
  } catch (error: any) {
    console.error('Power dialer action error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process action' },
      { status: 500 }
    );
  }
}

// Log call result for the current lead
async function logCallResult(session: any, result: {
  outcome: string;
  duration?: number;
  notes?: string;
  scheduleCallback?: Date;
}) {
  const lead = session.leads[session.currentIndex];
  if (!lead) return;

  // TODO: Insert into call_logs or lead_activities table
  // await db.insert(callLogs).values({
  //   leadId: lead.id,
  //   sessionId: session.id,
  //   outcome: result.outcome,
  //   duration: result.duration,
  //   notes: result.notes,
  //   callbackScheduled: result.scheduleCallback,
  //   createdAt: new Date(),
  // });

  console.log('Call result logged:', {
    sessionId: session.id,
    leadId: lead.id,
    ...result,
  });

  // If callback scheduled, create calendar event
  if (result.scheduleCallback) {
    // TODO: Create callback event
    // await db.insert(calendarEvents).values({...});
  }
}
