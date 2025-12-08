import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";

// Batch Job System for Admin Panel
// Processes skip traces in bulk: 250 per batch, up to 2,000 per day
// Integrates with SMS Queue for human-in-loop prep, preview, and deployment

interface BatchJob {
  id: string;
  type: "property_detail" | "skip_trace" | "sms_campaign" | "email_campaign";
  status: "pending" | "processing" | "completed" | "failed" | "paused" | "scheduled";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledFor?: string; // ISO date for scheduled runs
  createdBy?: string;

  // Job configuration
  config: {
    propertyIds?: string[];
    batchSize: number;
    autoSkipTrace?: boolean;
    pushToValuation?: boolean;
    pushToSmsQueue?: boolean; // Send results to SMS draft queue
    smsTemplate?: string;
    smsAgent?: "gianna" | "sabrina";
    campaignId?: string;
  };

  // Progress tracking
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    withPhones: number;
    currentBatch: number;
    totalBatches: number;
  };

  // Results
  results?: Array<{
    id: string;
    success: boolean;
    error?: string;
    data?: Record<string, unknown>;
    phones?: string[];
  }>;

  // SMS Queue Integration
  smsQueue?: {
    added: number;
    skipped: number;
    queueIds: string[];
  };

  // Daily limits
  dailyUsage: {
    date: string;
    used: number;
    limit: number;
    remaining: number;
  };
}

// In-memory storage (would be database in production)
const batchJobs = new Map<string, BatchJob>();
const dailyUsage = new Map<string, { used: number; date: string }>();
const scheduledJobs = new Map<string, NodeJS.Timeout>();

const BATCH_SIZE = 250;
const DAILY_LIMIT = 2000; // Matches skip-trace and SMS queue limits

// POST - Create or run a batch job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      jobId,
      type,
      propertyIds,
      autoSkipTrace = true,
      pushToValuation = true,
      pushToSmsQueue = true, // Auto-add to SMS draft queue
      smsTemplate,
      smsAgent = "gianna", // Default to Gianna for SMS
      campaignId,
      scheduledFor, // ISO datetime for scheduled jobs
      createdBy,
    } = body;

    // Get today's usage
    const today = new Date().toISOString().split("T")[0];
    const usage = dailyUsage.get(today) || { used: 0, date: today };
    const remaining = DAILY_LIMIT - usage.used;

    // === CREATE NEW JOB ===
    if (action === "create" && propertyIds && Array.isArray(propertyIds)) {
      if (remaining <= 0 && !scheduledFor) {
        return NextResponse.json({
          error: "Daily limit reached (2,000). Schedule for tomorrow or wait.",
          dailyUsage: { date: today, used: usage.used, limit: DAILY_LIMIT, remaining: 0 },
        }, { status: 429 });
      }

      const newJobId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const totalToProcess = Math.min(propertyIds.length, scheduledFor ? propertyIds.length : remaining);
      const totalBatches = Math.ceil(totalToProcess / BATCH_SIZE);

      const job: BatchJob = {
        id: newJobId,
        type: type || "skip_trace",
        status: scheduledFor ? "scheduled" : "pending",
        createdAt: new Date().toISOString(),
        scheduledFor,
        createdBy,
        config: {
          propertyIds: propertyIds.slice(0, totalToProcess),
          batchSize: BATCH_SIZE,
          autoSkipTrace,
          pushToValuation,
          pushToSmsQueue,
          smsTemplate,
          smsAgent,
          campaignId: campaignId || newJobId,
        },
        progress: {
          total: totalToProcess,
          processed: 0,
          successful: 0,
          failed: 0,
          withPhones: 0,
          currentBatch: 0,
          totalBatches,
        },
        results: [],
        dailyUsage: {
          date: today,
          used: usage.used,
          limit: DAILY_LIMIT,
          remaining,
        },
      };

      batchJobs.set(newJobId, job);

      // Schedule job if scheduledFor is provided
      if (scheduledFor) {
        const scheduledTime = new Date(scheduledFor).getTime();
        const now = Date.now();
        const delay = Math.max(0, scheduledTime - now);

        const timeout = setTimeout(async () => {
          console.log(`[Batch Jobs] Running scheduled job ${newJobId}`);
          job.status = "pending";
          await runJobBatches(job);
        }, delay);

        scheduledJobs.set(newJobId, timeout);
        console.log(`[Batch Jobs] Scheduled job ${newJobId} for ${scheduledFor} (${Math.round(delay / 60000)} min from now)`);
      }

      console.log(`[Batch Jobs] Created job ${newJobId}: ${totalToProcess} properties in ${totalBatches} batches`);

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          scheduledFor: job.scheduledFor,
          progress: job.progress,
          dailyUsage: job.dailyUsage,
          config: {
            pushToSmsQueue: job.config.pushToSmsQueue,
            smsAgent: job.config.smsAgent,
            campaignId: job.config.campaignId,
          },
        },
      });
    }

    // === START/RESUME JOB ===
    if ((action === "start" || action === "resume") && jobId) {
      const job = batchJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      if (job.status === "processing") {
        return NextResponse.json({ error: "Job already processing" }, { status: 400 });
      }

      job.status = "processing";
      job.startedAt = job.startedAt || new Date().toISOString();

      // Process next batch
      const result = await processNextBatch(job);

      batchJobs.set(jobId, job);

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          dailyUsage: job.dailyUsage,
        },
        batchResult: result,
      });
    }

    // === PAUSE JOB ===
    if (action === "pause" && jobId) {
      const job = batchJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      job.status = "paused";
      batchJobs.set(jobId, job);

      return NextResponse.json({ success: true, job: { id: job.id, status: job.status } });
    }

    // === CANCEL JOB ===
    if (action === "cancel" && jobId) {
      const job = batchJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      job.status = "failed";
      job.completedAt = new Date().toISOString();
      batchJobs.set(jobId, job);

      return NextResponse.json({ success: true, job: { id: job.id, status: job.status } });
    }

    return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("[Batch Jobs] Error:", error);
    return NextResponse.json({ error: "Batch job operation failed" }, { status: 500 });
  }
}

// Process the next batch of a job
async function processNextBatch(job: BatchJob): Promise<{
  batchNumber: number;
  processed: number;
  successful: number;
  failed: number;
  withPhones: number;
  smsQueued: number;
}> {
  const { propertyIds, batchSize } = job.config;
  if (!propertyIds) {
    return { batchNumber: 0, processed: 0, successful: 0, failed: 0, withPhones: 0, smsQueued: 0 };
  }

  const startIdx = job.progress.currentBatch * batchSize;
  const endIdx = Math.min(startIdx + batchSize, propertyIds.length);
  const batchIds = propertyIds.slice(startIdx, endIdx);

  if (batchIds.length === 0) {
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    return { batchNumber: job.progress.currentBatch, processed: 0, successful: 0, failed: 0, withPhones: 0, smsQueued: 0 };
  }

  console.log(`[Batch Jobs] Processing batch ${job.progress.currentBatch + 1}/${job.progress.totalBatches}: ${batchIds.length} properties`);

  let successful = 0;
  let failed = 0;
  let withPhones = 0;
  const leadsWithPhones: Array<{
    leadId: string;
    phone: string;
    firstName: string;
    lastName: string;
  }> = [];

  // Call the skip-trace endpoint for batch processing
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/skip-trace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: batchIds }),
    });

    const data = await response.json();

    if (data.success && data.results) {
      for (const result of data.results) {
        if (result.success) {
          successful++;
          const phones = result.phones?.map((p: { number: string }) => p.number) || [];

          job.results?.push({
            id: result.id || result.input?.propertyId,
            success: true,
            data: result,
            phones,
          });

          // Collect leads with mobile phones for SMS queue
          if (phones.length > 0) {
            withPhones++;
            const mobilePhone = result.phones?.find(
              (p: { type?: string }) => p.type?.toLowerCase() === "mobile" || p.type?.toLowerCase() === "cell"
            ) || result.phones?.[0];

            if (mobilePhone?.number) {
              leadsWithPhones.push({
                leadId: result.id || result.input?.propertyId || `lead_${Date.now()}`,
                phone: mobilePhone.number,
                firstName: result.firstName || result.ownerName?.split(" ")[0] || "",
                lastName: result.lastName || result.ownerName?.split(" ").slice(1).join(" ") || "",
              });
            }
          }
        } else {
          failed++;
          job.results?.push({
            id: result.id || result.input?.propertyId,
            success: false,
            error: result.error,
          });
        }
      }
    } else {
      // Batch failed entirely
      failed = batchIds.length;
      for (const id of batchIds) {
        job.results?.push({ id, success: false, error: data.error || "Batch skip trace failed" });
      }
    }
  } catch (err) {
    failed = batchIds.length;
    for (const id of batchIds) {
      job.results?.push({ id, success: false, error: String(err) });
    }
  }

  // Push to SMS draft queue if configured
  let smsQueued = 0;
  if (job.config.pushToSmsQueue && leadsWithPhones.length > 0 && job.config.smsTemplate) {
    const smsResult = smsQueueService.addToDraftQueue(leadsWithPhones, {
      templateCategory: "sms_initial",
      templateMessage: job.config.smsTemplate,
      personality: "brooklyn_bestie",
      campaignId: job.config.campaignId,
      priority: 5,
      agent: job.config.smsAgent || "gianna",
    });

    smsQueued = smsResult.added;

    if (!job.smsQueue) {
      job.smsQueue = { added: 0, skipped: 0, queueIds: [] };
    }
    job.smsQueue.added += smsResult.added;
    job.smsQueue.skipped += smsResult.skipped;
    job.smsQueue.queueIds.push(...smsResult.queueIds);

    console.log(`[Batch Jobs] Added ${smsResult.added} leads to SMS draft queue (campaign: ${job.config.campaignId})`);
  }

  // Update progress
  job.progress.currentBatch++;
  job.progress.processed += batchIds.length;
  job.progress.successful += successful;
  job.progress.failed += failed;
  job.progress.withPhones += withPhones;

  // Update daily usage
  const today = new Date().toISOString().split("T")[0];
  const usage = dailyUsage.get(today) || { used: 0, date: today };
  usage.used += batchIds.length;
  dailyUsage.set(today, usage);

  job.dailyUsage = {
    date: today,
    used: usage.used,
    limit: DAILY_LIMIT,
    remaining: DAILY_LIMIT - usage.used,
  };

  // Check if job is complete
  if (job.progress.currentBatch >= job.progress.totalBatches) {
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    console.log(`[Batch Jobs] Job ${job.id} completed: ${job.progress.successful}/${job.progress.total} successful, ${job.progress.withPhones} with phones`);
  } else {
    job.status = "paused"; // Pause after each batch so admin can continue
  }

  return {
    batchNumber: job.progress.currentBatch,
    processed: batchIds.length,
    successful,
    failed,
    withPhones,
    smsQueued,
  };
}

// Run all batches for a scheduled job
async function runJobBatches(job: BatchJob): Promise<void> {
  job.status = "processing";
  job.startedAt = new Date().toISOString();
  batchJobs.set(job.id, job);

  console.log(`[Batch Jobs] Starting scheduled job ${job.id}: ${job.progress.total} items in ${job.progress.totalBatches} batches`);

  while (job.progress.currentBatch < job.progress.totalBatches) {
    // Check daily limit
    const today = new Date().toISOString().split("T")[0];
    const usage = dailyUsage.get(today) || { used: 0, date: today };

    if (usage.used >= DAILY_LIMIT) {
      console.log(`[Batch Jobs] Daily limit reached, pausing job ${job.id}`);
      job.status = "paused";
      batchJobs.set(job.id, job);
      return;
    }

    // Process next batch
    const result = await processNextBatch(job);
    batchJobs.set(job.id, job);

    console.log(`[Batch Jobs] Batch ${result.batchNumber}/${job.progress.totalBatches}: ${result.successful} success, ${result.withPhones} phones, ${result.smsQueued} SMS queued`);

    // Small delay between batches to avoid overwhelming the API
    if (job.progress.currentBatch < job.progress.totalBatches) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  job.status = "completed";
  job.completedAt = new Date().toISOString();
  batchJobs.set(job.id, job);

  console.log(`[Batch Jobs] Scheduled job ${job.id} completed!`);
  console.log(`  - Processed: ${job.progress.processed}`);
  console.log(`  - Successful: ${job.progress.successful}`);
  console.log(`  - With phones: ${job.progress.withPhones}`);
  console.log(`  - SMS queued: ${job.smsQueue?.added || 0}`);
}

// GET - List batch jobs or get job status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Get specific job
  if (jobId) {
    const job = batchJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, job });
  }

  // Get today's usage
  const today = new Date().toISOString().split("T")[0];
  const usage = dailyUsage.get(today) || { used: 0, date: today };

  // List jobs
  let jobs = Array.from(batchJobs.values());

  // Filter by status if provided
  if (status) {
    jobs = jobs.filter((j) => j.status === status);
  }

  // Sort by createdAt descending
  jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Limit results
  jobs = jobs.slice(0, limit);

  return NextResponse.json({
    success: true,
    jobs: jobs.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      progress: j.progress,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
    })),
    count: jobs.length,
    dailyUsage: {
      date: today,
      used: usage.used,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - usage.used,
    },
  });
}
