/**
 * SMS Schedule API
 * Schedule SMS messages for future delivery
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { smsMessages } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { to, message, scheduledAt, leadId } = body;

    if (!to || !message || !scheduledAt) {
      return NextResponse.json(
        { error: "to, message, and scheduledAt are required" },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return NextResponse.json(
        { error: "scheduledAt must be in the future" },
        { status: 400 }
      );
    }

    // Create scheduled message
    const [scheduled] = await db
      .insert(smsMessages)
      .values({
        teamId,
        leadId: leadId || null,
        direction: "outbound",
        to,
        from: process.env.SIGNALHOUSE_FROM_NUMBER || "",
        body: message,
        status: "scheduled",
        scheduledAt: scheduleDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      scheduled: {
        id: scheduled.id,
        to,
        scheduledAt: scheduleDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[SMS Schedule] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schedule failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get scheduled messages
    const scheduled = await db.query.smsMessages.findMany({
      where: (msg, { eq, and }) =>
        and(eq(msg.teamId, teamId), eq(msg.status, "scheduled")),
      orderBy: (msg, { asc }) => [asc(msg.scheduledAt)],
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      scheduled,
    });
  } catch (error) {
    console.error("[SMS Schedule] GET Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
