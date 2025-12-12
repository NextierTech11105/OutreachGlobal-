import { NextRequest, NextResponse } from "next/server";
import {
  getEnrichmentJob,
  updateEnrichmentJob,
  getDailyUsage,
} from "@/lib/redis";

// GET - Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const job = await getEnrichmentJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const usage = await getDailyUsage();

    return NextResponse.json({
      job,
      usage,
      canContinue: job.status === "pending" && usage.remaining > 0,
    });
  } catch (error) {
    console.error("[Enrichment Job] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Update job (pause/resume)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const body = await request.json();
    const { action } = body;

    const job = await getEnrichmentJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (action === "pause") {
      if (job.status === "processing" || job.status === "pending") {
        job.status = "paused";
        await updateEnrichmentJob(job);
      }
    } else if (action === "resume") {
      if (job.status === "paused") {
        job.status = "pending";
        await updateEnrichmentJob(job);
      }
    } else if (action === "cancel") {
      if (job.status !== "completed") {
        job.status = "failed";
        job.error = "Cancelled by user";
        await updateEnrichmentJob(job);
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[Enrichment Job] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
