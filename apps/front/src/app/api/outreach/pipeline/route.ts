import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsMessages, callLogs, campaignAttempts, leads } from "@/lib/db/schema";
import { desc, gte, and, eq, sql, count } from "drizzle-orm";

/**
 * Outreach Pipeline API
 * CONNECTED TO: DigitalOcean Managed PostgreSQL
 * Returns real pipeline stats for the 10-touch outreach sequence
 */

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch campaign attempts grouped by touch number (campaignContext)
    const attemptsByTouch = await db
      .select({
        touchNumber: campaignAttempts.attemptNumber,
        count: count(),
      })
      .from(campaignAttempts)
      .where(gte(campaignAttempts.createdAt, thirtyDaysAgo))
      .groupBy(campaignAttempts.attemptNumber)
      .catch(() => []);

    // Build byTouch object from real data
    const byTouch: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
      6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
    };

    attemptsByTouch.forEach((row) => {
      const touchNum = row.touchNumber || 1;
      if (touchNum >= 1 && touchNum <= 10) {
        byTouch[touchNum] = Number(row.count) || 0;
      }
    });

    // Get total active leads in pipeline
    const totalActive = Object.values(byTouch).reduce((a, b) => a + b, 0);

    // Get completed this week (leads that finished all touches)
    const completedResult = await db
      .select({ count: count() })
      .from(campaignAttempts)
      .where(
        and(
          gte(campaignAttempts.createdAt, sevenDaysAgo),
          eq(campaignAttempts.attemptNumber, 10)
        )
      )
      .catch(() => [{ count: 0 }]);
    const completedThisWeek = Number(completedResult[0]?.count) || 0;

    // Get converted this week (leads that responded)
    const convertedResult = await db
      .select({ count: count() })
      .from(campaignAttempts)
      .where(
        and(
          gte(campaignAttempts.createdAt, sevenDaysAgo),
          eq(campaignAttempts.responseReceived, true)
        )
      )
      .catch(() => [{ count: 0 }]);
    const convertedThisWeek = Number(convertedResult[0]?.count) || 0;

    // Calculate response rate
    const totalAttempts = totalActive || 1;
    const responseRate = totalActive > 0
      ? Math.round((convertedThisWeek / totalAttempts) * 1000) / 10
      : 0;

    // Calculate average touches to response
    const avgTouchesToResponse = convertedThisWeek > 0
      ? Math.round(totalActive / convertedThisWeek * 10) / 10
      : 0;

    // Get opt-out count
    const optOutResult = await db
      .select({ count: count() })
      .from(leads)
      .where(eq(leads.optedOut, true))
      .catch(() => [{ count: 0 }]);
    const optOutCount = Number(optOutResult[0]?.count) || 0;
    const optOutRate = totalActive > 0
      ? Math.round((optOutCount / totalActive) * 1000) / 10
      : 0;

    // Build queue from pending attempts
    const pendingAttempts = await db
      .select({
        attemptNumber: campaignAttempts.attemptNumber,
        count: count(),
        nextScheduled: sql<Date>`MIN(${campaignAttempts.scheduledAt})`,
      })
      .from(campaignAttempts)
      .where(eq(campaignAttempts.status, "pending"))
      .groupBy(campaignAttempts.attemptNumber)
      .orderBy(campaignAttempts.attemptNumber)
      .limit(5)
      .catch(() => []);

    const queue = pendingAttempts.map((row) => {
      const scheduledDate = row.nextScheduled ? new Date(row.nextScheduled) : new Date();
      const isToday = scheduledDate.toDateString() === now.toDateString();
      const isTomorrow = scheduledDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

      let nextBatch = scheduledDate.toLocaleDateString("en-US", { weekday: "long" });
      if (isToday) nextBatch = "Today";
      if (isTomorrow) nextBatch = "Tomorrow";
      nextBatch += " " + scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

      return {
        touch: row.attemptNumber || 1,
        count: Number(row.count) || 0,
        nextBatch,
      };
    });

    return NextResponse.json({
      success: true,
      database: "postgresql",
      stats: {
        totalActive,
        byTouch,
        completedThisWeek,
        convertedThisWeek,
        responseRate,
        avgTouchesToResponse,
        optOutRate,
      },
      queue,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Outreach pipeline error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch pipeline",
        stats: {
          totalActive: 0,
          byTouch: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
          completedThisWeek: 0,
          convertedThisWeek: 0,
          responseRate: 0,
          avgTouchesToResponse: 0,
          optOutRate: 0,
        },
        queue: [],
      },
      { status: 500 }
    );
  }
}
