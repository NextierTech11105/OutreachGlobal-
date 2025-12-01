import { NextResponse } from "next/server";
import { getDailyUsage, DAILY_LIMIT, BATCH_SIZE } from "@/lib/redis";

// GET - Get daily usage stats
export async function GET() {
  try {
    const usage = await getDailyUsage();

    return NextResponse.json({
      ...usage,
      limit: DAILY_LIMIT,
      batchSize: BATCH_SIZE,
      percentUsed: Math.round((usage.count / DAILY_LIMIT) * 100),
      resetsAt: `${usage.date}T00:00:00Z (next day)`,
    });
  } catch (error) {
    console.error("[Enrichment Usage] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
