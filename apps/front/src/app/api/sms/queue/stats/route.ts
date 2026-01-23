/**
 * SMS Queue Stats API
 * Real-time stats for the Workflow Command Center
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { smsMessages, leads } from "@/lib/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId, teamId } = await apiAuth();
    if (!userId || !teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get sent today count
    const sentTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.teamId, teamId),
          eq(smsMessages.direction, "outbound"),
          gte(smsMessages.createdAt, today)
        )
      );

    // Get scheduled count
    const scheduledResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.teamId, teamId),
          eq(smsMessages.status, "scheduled")
        )
      );

    // Get queue size (pending messages)
    const queueResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.teamId, teamId),
          eq(smsMessages.status, "pending")
        )
      );

    // Get active sequences count (leads with sequence tag)
    const sequenceResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          eq(leads.teamId, teamId),
          sql`tags @> ARRAY['sequence']::text[]`
        )
      );

    return NextResponse.json({
      success: true,
      sentToday: Number(sentTodayResult[0]?.count || 0),
      scheduledToday: Number(scheduledResult[0]?.count || 0),
      queueSize: Number(queueResult[0]?.count || 0),
      activeSequences: Number(sequenceResult[0]?.count || 0),
    });
  } catch (error) {
    console.error("[SMS Queue Stats] Error:", error);
    // Return zeros on error to keep UI working
    return NextResponse.json({
      success: true,
      sentToday: 0,
      scheduledToday: 0,
      queueSize: 0,
      activeSequences: 0,
    });
  }
}
