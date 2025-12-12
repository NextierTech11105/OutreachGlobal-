import { NextRequest, NextResponse } from "next/server";
import {
  getEnrichmentJob,
  updateEnrichmentJob,
  getNextQueuedJob,
  getDailyUsage,
  incrementDailyUsage,
  BATCH_SIZE,
  EnrichmentResult,
} from "@/lib/redis";

const REALESTATE_API_KEY =
  process.env.REAL_ESTATE_API_KEY ||
  process.env.REALESTATE_API_KEY ||
  "NEXTIER-2906-74a1-8684-d2f63f473b7b";
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/PropertyDetail";

// Process a single property through PropertyDetail API
async function enrichProperty(propertyId: string): Promise<EnrichmentResult> {
  try {
    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": REALESTATE_API_KEY,
      },
      body: JSON.stringify({ id: String(propertyId) }),
    });

    if (!response.ok) {
      return {
        propertyId,
        success: false,
        phones: [],
        emails: [],
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const prop = data.data || data;

    // Extract phones
    const phones: string[] = [];
    if (prop.ownerPhone) phones.push(prop.ownerPhone);
    if (prop.owner1Phone) phones.push(prop.owner1Phone);
    if (prop.owner2Phone) phones.push(prop.owner2Phone);
    if (prop.phones && Array.isArray(prop.phones)) phones.push(...prop.phones);
    if (prop.skipTrace?.phones) phones.push(...prop.skipTrace.phones);

    // Extract emails
    const emails: string[] = [];
    if (prop.ownerEmail) emails.push(prop.ownerEmail);
    if (prop.owner1Email) emails.push(prop.owner1Email);
    if (prop.owner2Email) emails.push(prop.owner2Email);
    if (prop.emails && Array.isArray(prop.emails)) emails.push(...prop.emails);
    if (prop.skipTrace?.emails) emails.push(...prop.skipTrace.emails);

    return {
      propertyId,
      success: true,
      owner1FirstName: prop.owner1FirstName,
      owner1LastName: prop.owner1LastName,
      owner2FirstName: prop.owner2FirstName,
      owner2LastName: prop.owner2LastName,
      phones: Array.from(new Set(phones.filter(Boolean))),
      emails: Array.from(new Set(emails.filter(Boolean))),
      mailingAddress: prop.mailingAddress
        ? {
            street:
              prop.mailingAddress.street || prop.mailingAddress.address || "",
            city: prop.mailingAddress.city || "",
            state: prop.mailingAddress.state || "",
            zip: prop.mailingAddress.zip || "",
          }
        : undefined,
      estimatedValue: prop.estimatedValue || prop.avm?.value,
      estimatedEquity: prop.estimatedEquity,
      lastSaleDate: prop.lastSaleDate,
      lastSaleAmount: prop.lastSaleAmount || prop.lastSalePrice,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      propertyId,
      success: false,
      phones: [],
      emails: [],
      error: message,
    };
  }
}

// POST - Process next batch from queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { jobId: specificJobId } = body;

    // Check daily limit first
    const usage = await getDailyUsage();
    if (usage.remaining < 1) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          usage,
          message: "Cannot process more properties today. Try again tomorrow.",
        },
        { status: 429 },
      );
    }

    // Get job to process
    let jobId = specificJobId;
    if (!jobId) {
      jobId = await getNextQueuedJob();
      if (!jobId) {
        return NextResponse.json({
          message: "No jobs in queue",
          usage,
        });
      }
    }

    const job = await getEnrichmentJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed") {
      return NextResponse.json({
        message: "Job already completed",
        job,
      });
    }

    if (job.status === "failed" || job.status === "paused") {
      return NextResponse.json({
        message: `Job is ${job.status}`,
        job,
      });
    }

    // Update job status
    job.status = "processing";
    if (!job.startedAt) job.startedAt = new Date().toISOString();
    await updateEnrichmentJob(job);

    // Calculate next batch
    const startIdx = job.progress.processed;
    const batchSize = Math.min(
      BATCH_SIZE,
      job.propertyIds.length - startIdx,
      usage.remaining,
    );
    const batchIds = job.propertyIds.slice(startIdx, startIdx + batchSize);

    if (batchIds.length === 0) {
      job.status = "completed";
      job.completedAt = new Date().toISOString();
      await updateEnrichmentJob(job);
      return NextResponse.json({
        message: "Job completed",
        job,
      });
    }

    // Check and increment daily usage
    const canIncrement = await incrementDailyUsage(batchIds.length);
    if (!canIncrement) {
      job.status = "paused";
      await updateEnrichmentJob(job);
      return NextResponse.json(
        {
          error: "Daily limit would be exceeded",
          message: "Job paused. Resume tomorrow.",
          job,
          usage: await getDailyUsage(),
        },
        { status: 429 },
      );
    }

    console.log(
      `[Enrichment] Processing batch ${job.progress.currentBatch + 1}/${job.progress.totalBatches} - ${batchIds.length} IDs`,
    );

    // Process batch with concurrency limit
    const concurrency = 10;
    const batchResults: EnrichmentResult[] = [];

    for (let i = 0; i < batchIds.length; i += concurrency) {
      const chunk = batchIds.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(enrichProperty));
      batchResults.push(...chunkResults);

      // Small delay between chunks to avoid rate limits
      if (i + concurrency < batchIds.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Update job with results
    const successful = batchResults.filter((r) => r.success).length;
    const failed = batchResults.filter((r) => !r.success).length;

    job.progress.processed += batchIds.length;
    job.progress.successful += successful;
    job.progress.failed += failed;
    job.progress.currentBatch += 1;
    job.results = [...(job.results || []), ...batchResults];

    // Check if complete
    if (job.progress.processed >= job.propertyIds.length) {
      job.status = "completed";
      job.completedAt = new Date().toISOString();
    } else {
      // Re-queue if more batches needed
      job.status = "pending";
    }

    await updateEnrichmentJob(job);

    const updatedUsage = await getDailyUsage();

    return NextResponse.json({
      success: true,
      job,
      batchStats: {
        processed: batchIds.length,
        successful,
        failed,
        withPhones: batchResults.filter((r) => r.phones.length > 0).length,
        withEmails: batchResults.filter((r) => r.emails.length > 0).length,
      },
      usage: updatedUsage,
      nextBatchReady: job.status === "pending",
    });
  } catch (error) {
    console.error("[Enrichment Process] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get processing status
export async function GET() {
  try {
    const usage = await getDailyUsage();
    const nextJobId = await getNextQueuedJob();

    // Put it back if we peeked
    // Note: In production, you'd want LINDEX instead of LPOP
    return NextResponse.json({
      hasQueuedJobs: !!nextJobId,
      usage,
      batchSize: BATCH_SIZE,
      message: nextJobId
        ? "Jobs in queue ready to process"
        : "No jobs in queue",
    });
  } catch (error) {
    console.error("[Enrichment Process] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
