import { NextResponse } from "next/server";
import { getDailyUsage, DAILY_LIMIT, BATCH_SIZE, isRedisAvailable } from "@/lib/redis";

// GET - Get daily usage stats
export async function GET() {
  try {
    // If Redis isn't configured, return default values
    if (!isRedisAvailable()) {
      const today = new Date().toISOString().split("T")[0];
      return NextResponse.json({
        date: today,
        count: 0,
        remaining: DAILY_LIMIT,
        limit: DAILY_LIMIT,
        batchSize: BATCH_SIZE,
        percentUsed: 0,
        resetsAt: `${today}T00:00:00Z (next day)`,
        redisConfigured: false,
      });
    }

    const usage = await getDailyUsage();

    return NextResponse.json({
      ...usage,
      limit: DAILY_LIMIT,
      batchSize: BATCH_SIZE,
      percentUsed: Math.round((usage.count / DAILY_LIMIT) * 100),
      resetsAt: `${usage.date}T00:00:00Z (next day)`,
      redisConfigured: true,
    });
  } catch (error) {
    console.error("[Enrichment Usage] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
