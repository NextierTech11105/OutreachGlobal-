import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/lib/db/schema";

/**
 * POST /api/calls/log
 * Log a call event to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      callSid,
      from,
      to,
      direction,
      duration,
      leadId,
      answeredAt,
      endedAt,
      disposition,
      notes,
    } = body;

    if (!callSid || !from) {
      return NextResponse.json(
        { error: "callSid and from are required" },
        { status: 400 }
      );
    }

    if (!db) {
      // Log to console if DB not available
      console.log("[Call Log] DB not available, logging to console:", {
        callSid,
        from,
        direction,
        duration,
      });
      return NextResponse.json({ success: true, logged: "console" });
    }

    const callLogEntry = {
      id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      leadId: leadId || null,
      userId: null, // Will be set from auth context in production
      direction: direction || "inbound",
      fromNumber: from,
      toNumber: to || "",
      status: "completed",
      duration: duration || 0,
      disposition: disposition || null,
      dispositionNotes: notes || null,
      provider: "twilio",
      providerCallId: callSid,
      startTime: answeredAt ? new Date(answeredAt) : new Date(),
      endTime: endedAt ? new Date(endedAt) : new Date(),
      answerTime: answeredAt ? new Date(answeredAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(callLogs).values(callLogEntry);

    console.log("[Call Log] Saved:", { callSid, from, duration });

    return NextResponse.json({
      success: true,
      callLogId: callLogEntry.id,
    });
  } catch (error) {
    console.error("[Call Log] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log call" },
      { status: 500 }
    );
  }
}
