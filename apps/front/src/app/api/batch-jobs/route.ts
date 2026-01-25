import { NextRequest, NextResponse } from "next/server";
import { smsQueueService } from "@/lib/services/sms-queue-service";
import { db } from "@/lib/db";
import { batchJobs, appState } from "@/lib/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

/**
 * Batch Job System for Admin Panel
 * Processes skip traces in bulk: 250 per batch, up to 2,000 per day
 * Integrates with SMS Queue for human-in-loop prep, preview, and deployment
 *
 * Uses batchJobs table for persistence.
 */

const BATCH_SIZE = 250;
const DAILY_LIMIT = 2000; // Matches skip-trace and SMS queue limits

// Helper to get daily usage from database
async function getDailyUsage(teamId: string = "default"): Promise<{
  used: number;
  date: string;
}> {
  const today = new Date().toISOString().split("T")[0];
  const key = `daily_usage:batch_jobs:${today}`;

  const [state] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (state?.value) {
    return state.value as { used: number; date: string };
  }

  return { used: 0, date: today };
}

// Helper to update daily usage
async function updateDailyUsage(
  teamId: string = "default",
  increment: number
): Promise<{ used: number; date: string }> {
  const today = new Date().toISOString().split("T")[0];
  const key = `daily_usage:batch_jobs:${today}`;

  const current = await getDailyUsage(teamId);
  const newUsage = { used: current.used + increment, date: today };

  const [existing] = await db
    .select()
    .from(appState)
    .where(and(eq(appState.key, key), eq(appState.teamId, teamId)))
    .limit(1);

  if (existing) {
    await db
      .update(appState)
      .set({ value: newUsage, updatedAt: new Date() })
      .where(eq(appState.id, existing.id));
  } else {
    await db.insert(appState).values({
      id: `as_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teamId,
      key,
      value: newUsage,
    });
  }

  return newUsage;
}

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
      pushToSmsQueue = true,
      smsTemplate,
      smsAgent = "gianna",
      campaignId,
      scheduledFor,
      createdBy,
      teamId = "default",
    } = body;

    // Get today's usage
    const today = new Date().toISOString().split("T")[0];
    const usage = await getDailyUsage(teamId);
    const remaining = DAILY_LIMIT - usage.used;

    // === CREATE NEW JOB ===
    if (action === "create" && propertyIds && Array.isArray(propertyIds)) {
      if (remaining <= 0 && !scheduledFor) {
        return NextResponse.json(
          {
            error:
              "Daily limit reached (2,000). Schedule for tomorrow or wait.",
            dailyUsage: {
              date: today,
              used: usage.used,
              limit: DAILY_LIMIT,
              remaining: 0,
            },
          },
          { status: 429 }
        );
      }

      const newJobId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const totalToProcess = Math.min(
        propertyIds.length,
        scheduledFor ? propertyIds.length : remaining
      );
      const totalBatches = Math.ceil(totalToProcess / BATCH_SIZE);

      // Store job config and progress in jsonb fields
      const config = {
        propertyIds: propertyIds.slice(0, totalToProcess),
        batchSize: BATCH_SIZE,
        autoSkipTrace,
        pushToValuation,
        pushToSmsQueue,
        smsTemplate,
        smsAgent,
        campaignId: campaignId || newJobId,
      };

      const results: unknown[] = [];

      await db.insert(batchJobs).values({
        id: newJobId,
        teamId,
        userId: createdBy,
        type: type || "skip_trace",
        status: scheduledFor ? "pending" : "pending", // Will be scheduled separately
        priority: "medium",
        total: totalToProcess,
        processed: 0,
        successful: 0,
        failed: 0,
        config,
        results,
        scheduledAt: scheduledFor ? new Date(scheduledFor) : null,
      });

      console.log(
        `[Batch Jobs] Created job ${newJobId}: ${totalToProcess} properties in ${totalBatches} batches`
      );

      return NextResponse.json({
        success: true,
        job: {
          id: newJobId,
          type: type || "skip_trace",
          status: scheduledFor ? "scheduled" : "pending",
          scheduledFor,
          progress: {
            total: totalToProcess,
            processed: 0,
            successful: 0,
            failed: 0,
            withPhones: 0,
            currentBatch: 0,
            totalBatches,
          },
          dailyUsage: {
            date: today,
            used: usage.used,
            limit: DAILY_LIMIT,
            remaining,
          },
          config: {
            pushToSmsQueue,
            smsAgent,
            campaignId: config.campaignId,
          },
        },
      });
    }

    // === START/RESUME JOB ===
    if ((action === "start" || action === "resume") && jobId) {
      const [job] = await db
        .select()
        .from(batchJobs)
        .where(eq(batchJobs.id, jobId))
        .limit(1);

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      if (job.status === "processing") {
        return NextResponse.json(
          { error: "Job already processing" },
          { status: 400 }
        );
      }

      await db
        .update(batchJobs)
        .set({
          status: "processing",
          startedAt: job.startedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(batchJobs.id, jobId));

      // Process next batch
      const result = await processNextBatch(jobId, teamId);

      // Refresh job data
      const [updatedJob] = await db
        .select()
        .from(batchJobs)
        .where(eq(batchJobs.id, jobId))
        .limit(1);

      const currentUsage = await getDailyUsage(teamId);

      return NextResponse.json({
        success: true,
        job: {
          id: updatedJob.id,
          status: updatedJob.status,
          progress: {
            total: updatedJob.total,
            processed: updatedJob.processed,
            successful: updatedJob.successful,
            failed: updatedJob.failed,
            withPhones: (updatedJob.config as any)?.withPhones || 0,
            currentBatch: (updatedJob.config as any)?.currentBatch || 0,
            totalBatches:
              Math.ceil((updatedJob.total || 0) / BATCH_SIZE) || 0,
          },
          dailyUsage: {
            date: today,
            used: currentUsage.used,
            limit: DAILY_LIMIT,
            remaining: DAILY_LIMIT - currentUsage.used,
          },
        },
        batchResult: result,
      });
    }

    // === PAUSE JOB ===
    if (action === "pause" && jobId) {
      const [job] = await db
        .select()
        .from(batchJobs)
        .where(eq(batchJobs.id, jobId))
        .limit(1);

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      await db
        .update(batchJobs)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(batchJobs.id, jobId));

      return NextResponse.json({
        success: true,
        job: { id: jobId, status: "pending" },
      });
    }

    // === CANCEL JOB ===
    if (action === "cancel" && jobId) {
      const [job] = await db
        .select()
        .from(batchJobs)
        .where(eq(batchJobs.id, jobId))
        .limit(1);

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      await db
        .update(batchJobs)
        .set({
          status: "cancelled",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(batchJobs.id, jobId));

      return NextResponse.json({
        success: true,
        job: { id: jobId, status: "cancelled" },
      });
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Batch Jobs] Error:", error);
    return NextResponse.json(
      { error: "Batch job operation failed" },
      { status: 500 }
    );
  }
}

// Process the next batch of a job
async function processNextBatch(
  jobId: string,
  teamId: string
): Promise<{
  batchNumber: number;
  processed: number;
  successful: number;
  failed: number;
  withPhones: number;
  smsQueued: number;
}> {
  const [job] = await db
    .select()
    .from(batchJobs)
    .where(eq(batchJobs.id, jobId))
    .limit(1);

  if (!job) {
    return {
      batchNumber: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      withPhones: 0,
      smsQueued: 0,
    };
  }

  const config = job.config as any;
  const propertyIds = config?.propertyIds || [];
  const batchSize = config?.batchSize || BATCH_SIZE;
  const currentBatch = config?.currentBatch || 0;

  const startIdx = currentBatch * batchSize;
  const endIdx = Math.min(startIdx + batchSize, propertyIds.length);
  const batchIds = propertyIds.slice(startIdx, endIdx);

  if (batchIds.length === 0) {
    await db
      .update(batchJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(batchJobs.id, jobId));

    return {
      batchNumber: currentBatch,
      processed: 0,
      successful: 0,
      failed: 0,
      withPhones: 0,
      smsQueued: 0,
    };
  }

  const totalBatches = Math.ceil(propertyIds.length / batchSize);
  console.log(
    `[Batch Jobs] Processing batch ${currentBatch + 1}/${totalBatches}: ${batchIds.length} properties`
  );

  let successful = 0;
  let failed = 0;
  let withPhones = 0;
  const leadsWithPhones: Array<{
    leadId: string;
    phone: string;
    firstName: string;
    lastName: string;
  }> = [];

  const results = (job.results as any[]) || [];

  // Call the skip-trace endpoint for batch processing
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/skip-trace`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: batchIds }),
      }
    );

    const data = await response.json();

    if (data.success && data.results) {
      for (const result of data.results) {
        if (result.success) {
          successful++;
          const phones =
            result.phones?.map((p: { number: string }) => p.number) || [];

          results.push({
            id: result.id || result.input?.propertyId,
            success: true,
            data: result,
            phones,
          });

          if (phones.length > 0) {
            withPhones++;
            const mobilePhone =
              result.phones?.find(
                (p: { type?: string }) =>
                  p.type?.toLowerCase() === "mobile" ||
                  p.type?.toLowerCase() === "cell"
              ) || result.phones?.[0];

            if (mobilePhone?.number) {
              leadsWithPhones.push({
                leadId:
                  result.id || result.input?.propertyId || `lead_${Date.now()}`,
                phone: mobilePhone.number,
                firstName:
                  result.firstName || result.ownerName?.split(" ")[0] || "",
                lastName:
                  result.lastName ||
                  result.ownerName?.split(" ").slice(1).join(" ") ||
                  "",
              });
            }
          }
        } else {
          failed++;
          results.push({
            id: result.id || result.input?.propertyId,
            success: false,
            error: result.error,
          });
        }
      }
    } else {
      failed = batchIds.length;
      for (const id of batchIds) {
        results.push({
          id,
          success: false,
          error: data.error || "Batch skip trace failed",
        });
      }
    }
  } catch (err) {
    failed = batchIds.length;
    for (const id of batchIds) {
      results.push({ id, success: false, error: String(err) });
    }
  }

  // Push to SMS draft queue if configured
  let smsQueued = 0;
  if (config?.pushToSmsQueue && leadsWithPhones.length > 0 && config?.smsTemplate) {
    const smsResult = smsQueueService.addToDraftQueue(leadsWithPhones, {
      templateCategory: "sms_initial",
      templateMessage: config.smsTemplate,
      personality: "brooklyn_bestie",
      campaignId: config.campaignId,
      priority: 5,
      agent: config.smsAgent || "gianna",
    });

    smsQueued = smsResult.added;
    console.log(
      `[Batch Jobs] Added ${smsResult.added} leads to SMS draft queue (campaign: ${config.campaignId})`
    );
  }

  // Update daily usage
  await updateDailyUsage(teamId, batchIds.length);

  // Update job in database
  const newCurrentBatch = currentBatch + 1;
  const isComplete = newCurrentBatch >= totalBatches;

  await db
    .update(batchJobs)
    .set({
      processed: (job.processed || 0) + batchIds.length,
      successful: (job.successful || 0) + successful,
      failed: (job.failed || 0) + failed,
      results,
      config: {
        ...config,
        currentBatch: newCurrentBatch,
        withPhones: (config?.withPhones || 0) + withPhones,
        smsQueued: (config?.smsQueued || 0) + smsQueued,
      },
      status: isComplete ? "completed" : "pending",
      completedAt: isComplete ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(batchJobs.id, jobId));

  if (isComplete) {
    console.log(
      `[Batch Jobs] Job ${jobId} completed: ${(job.successful || 0) + successful}/${job.total} successful`
    );
  }

  return {
    batchNumber: newCurrentBatch,
    processed: batchIds.length,
    successful,
    failed,
    withPhones,
    smsQueued,
  };
}

// GET - List batch jobs or get job status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20");
  const teamId = searchParams.get("teamId") || "default";

  // Get specific job
  if (jobId) {
    const [job] = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const config = job.config as any;
    return NextResponse.json({
      success: true,
      job: {
        ...job,
        progress: {
          total: job.total,
          processed: job.processed,
          successful: job.successful,
          failed: job.failed,
          withPhones: config?.withPhones || 0,
          currentBatch: config?.currentBatch || 0,
          totalBatches:
            Math.ceil((job.total || 0) / BATCH_SIZE) || 0,
        },
      },
    });
  }

  // Get today's usage
  const today = new Date().toISOString().split("T")[0];
  const usage = await getDailyUsage(teamId);

  // Build query conditions
  const conditions = [eq(batchJobs.teamId, teamId)];
  if (status) {
    conditions.push(eq(batchJobs.status, status));
  }

  // List jobs
  const jobs = await db
    .select()
    .from(batchJobs)
    .where(and(...conditions))
    .orderBy(desc(batchJobs.createdAt))
    .limit(limit);

  return NextResponse.json({
    success: true,
    jobs: jobs.map((j) => {
      const config = j.config as any;
      return {
        id: j.id,
        type: j.type,
        status: j.status,
        progress: {
          total: j.total,
          processed: j.processed,
          successful: j.successful,
          failed: j.failed,
          withPhones: config?.withPhones || 0,
          currentBatch: config?.currentBatch || 0,
          totalBatches: Math.ceil((j.total || 0) / BATCH_SIZE) || 0,
        },
        createdAt: j.createdAt,
        completedAt: j.completedAt,
      };
    }),
    count: jobs.length,
    dailyUsage: {
      date: today,
      used: usage.used,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - usage.used,
    },
  });
}
