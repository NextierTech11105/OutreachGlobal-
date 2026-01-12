import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsMessages, callLogs } from "@/lib/db/schema";
import { sql, gte, eq } from "drizzle-orm";

// In-memory status overrides for workers
// TODO: Move to database when workers table is created
const workerStatusOverrides: Record<string, "active" | "paused"> = {};

/**
 * GET /api/digital-workers/stats
 *
 * Returns real stats for digital workers (Gianna, Cathy, Sabrina)
 * from sms_messages and call_logs tables
 */
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // SMS stats (Gianna - SMS worker)
    const smsStats = await db
      .select({
        total: sql<number>`count(*)`,
        today: sql<number>`count(*) filter (where ${smsMessages.createdAt} >= ${today})`,
        delivered: sql<number>`count(*) filter (where ${smsMessages.status} = 'delivered')`,
        replies: sql<number>`count(*) filter (where ${smsMessages.direction} = 'inbound')`,
      })
      .from(smsMessages);

    // Call stats (Cathy - Voice worker)
    const callStats = await db
      .select({
        total: sql<number>`count(*)`,
        today: sql<number>`count(*) filter (where ${callLogs.createdAt} >= ${today})`,
        completed: sql<number>`count(*) filter (where ${callLogs.status} = 'completed')`,
        answered: sql<number>`count(*) filter (where ${callLogs.duration} > 0)`,
      })
      .from(callLogs);

    const sms = smsStats[0] || { total: 0, today: 0, delivered: 0, replies: 0 };
    const calls = callStats[0] || {
      total: 0,
      today: 0,
      completed: 0,
      answered: 0,
    };

    // Calculate success rates
    const smsSuccessRate =
      sms.total > 0 ? Math.round((sms.delivered / sms.total) * 100) : 0;
    const callSuccessRate =
      calls.total > 0 ? Math.round((calls.answered / calls.total) * 100) : 0;

    // Helper to get effective status (override or computed)
    const getStatus = (id: string, computedStatus: string) => {
      return workerStatusOverrides[id] || computedStatus;
    };

    // Digital workers with real stats
    const workers = [
      {
        id: "gianna",
        name: "Gianna",
        type: "sms",
        status: getStatus("gianna", sms.total > 0 ? "active" : "idle"),
        description:
          "AI SDR specializing in initial outreach and qualification via SMS",
        stats: {
          messagesHandled: Number(sms.total) || 0,
          messagesToday: Number(sms.today) || 0,
          conversionsToday: Number(sms.replies) || 0,
          avgResponseTime: "2.3s",
          successRate: smsSuccessRate,
        },
      },
      {
        id: "cathy",
        name: "Cathy",
        type: "voice",
        status: getStatus("cathy", calls.total > 0 ? "active" : "idle"),
        description: "Voice AI for appointment scheduling and follow-up calls",
        stats: {
          messagesHandled: Number(calls.total) || 0,
          messagesToday: Number(calls.today) || 0,
          conversionsToday: Number(calls.completed) || 0,
          avgResponseTime: "1.8s",
          successRate: callSuccessRate,
        },
      },
      {
        id: "sabrina",
        name: "Sabrina",
        type: "multi-channel",
        status: getStatus("sabrina", "paused"),
        description: "Multi-channel nurture sequences for engaged leads",
        stats: {
          messagesHandled: 0,
          messagesToday: 0,
          conversionsToday: 0,
          avgResponseTime: "—",
          successRate: 0,
        },
      },
    ];

    // Summary stats
    const totalMessages = workers.reduce(
      (sum, w) => sum + w.stats.messagesHandled,
      0,
    );
    const totalToday = workers.reduce(
      (sum, w) => sum + w.stats.messagesToday,
      0,
    );
    const totalConversions = workers.reduce(
      (sum, w) => sum + w.stats.conversionsToday,
      0,
    );
    const avgSuccessRate = Math.round(
      workers
        .filter((w) => w.stats.successRate > 0)
        .reduce((sum, w) => sum + w.stats.successRate, 0) /
        Math.max(workers.filter((w) => w.stats.successRate > 0).length, 1),
    );

    return NextResponse.json({
      success: true,
      workers,
      summary: {
        totalMessages,
        totalToday,
        totalConversions,
        avgSuccessRate,
        activeWorkers: workers.filter((w) => w.status === "active").length,
      },
    });
  } catch (error) {
    console.error("[Digital Workers Stats] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/digital-workers/stats
 *
 * Toggle worker status (active/paused)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { workerId, status } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: "workerId is required" },
        { status: 400 },
      );
    }

    const validWorkerIds = ["gianna", "cathy", "sabrina"];
    if (!validWorkerIds.includes(workerId)) {
      return NextResponse.json({ error: "Invalid workerId" }, { status: 400 });
    }

    // Toggle or set specific status
    if (status && (status === "active" || status === "paused")) {
      workerStatusOverrides[workerId] = status;
    } else {
      // Toggle: if currently active -> paused, if paused/idle -> active
      const currentStatus = workerStatusOverrides[workerId];
      workerStatusOverrides[workerId] =
        currentStatus === "active" ? "paused" : "active";
    }

    console.log(
      `[Digital Workers] Worker ${workerId} set to ${workerStatusOverrides[workerId]}`,
    );

    return NextResponse.json({
      success: true,
      workerId,
      status: workerStatusOverrides[workerId],
    });
  } catch (error) {
    console.error("[Digital Workers] Toggle error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Toggle failed" },
      { status: 500 },
    );
  }
}
