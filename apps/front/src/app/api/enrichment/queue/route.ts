import { NextRequest, NextResponse } from "next/server";
import {
  createEnrichmentJob,
  getEnrichmentJobs,
  getDailyUsage,
  DAILY_LIMIT,
  BATCH_SIZE,
} from "@/lib/redis";

// POST - Create new enrichment job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucketId, bucketLabel, propertyIds } = body;

    if (!bucketId || !propertyIds || !Array.isArray(propertyIds)) {
      return NextResponse.json(
        { error: "bucketId and propertyIds array required" },
        { status: 400 },
      );
    }

    if (propertyIds.length === 0) {
      return NextResponse.json(
        { error: "propertyIds cannot be empty" },
        { status: 400 },
      );
    }

    // Check daily limit
    const usage = await getDailyUsage();
    if (usage.remaining === 0) {
      return NextResponse.json(
        {
          error: "Daily enrichment limit reached",
          usage,
          resetsAt: `${usage.date}T00:00:00Z (next day)`,
        },
        { status: 429 },
      );
    }

    // Calculate how many we can process today
    const canProcess = Math.min(propertyIds.length, usage.remaining);
    const idsToProcess = propertyIds.slice(0, canProcess);
    const remainingIds = propertyIds.slice(canProcess);

    // Create job
    const job = await createEnrichmentJob(
      bucketId,
      bucketLabel || bucketId,
      idsToProcess,
    );

    const response: {
      success: boolean;
      job: typeof job;
      usage: typeof usage;
      batchSize: number;
      totalBatches: number;
      warning?: string;
      remainingIds?: string[];
    } = {
      success: true,
      job,
      usage: {
        ...usage,
        remaining: usage.remaining - idsToProcess.length,
      },
      batchSize: BATCH_SIZE,
      totalBatches: job.progress.totalBatches,
    };

    if (remainingIds.length > 0) {
      response.warning = `Only ${idsToProcess.length} of ${propertyIds.length} IDs queued due to daily limit. ${remainingIds.length} remaining.`;
      response.remainingIds = remainingIds;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Enrichment Queue] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - List all enrichment jobs
export async function GET() {
  try {
    const [jobs, usage] = await Promise.all([
      getEnrichmentJobs(50),
      getDailyUsage(),
    ]);

    return NextResponse.json({
      jobs,
      usage,
      limits: {
        daily: DAILY_LIMIT,
        batchSize: BATCH_SIZE,
      },
    });
  } catch (error) {
    console.error("[Enrichment Queue] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
