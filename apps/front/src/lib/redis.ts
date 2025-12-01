import { Redis } from "@upstash/redis";

// Redis client for enrichment queue
// Uses Upstash REST API (works in serverless environments)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Keys
export const ENRICHMENT_QUEUE_KEY = "enrichment:queue";
export const ENRICHMENT_JOBS_KEY = "enrichment:jobs";
export const ENRICHMENT_DAILY_KEY = (date: string) => `enrichment:daily:${date}`;
export const ENRICHMENT_JOB_KEY = (jobId: string) => `enrichment:job:${jobId}`;

// Limits
export const DAILY_LIMIT = 5000;
export const BATCH_SIZE = 250;

export interface EnrichmentJob {
  id: string;
  bucketId: string;
  bucketLabel: string;
  propertyIds: string[];
  status: "pending" | "processing" | "completed" | "failed" | "paused";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    currentBatch: number;
    totalBatches: number;
  };
  results?: EnrichmentResult[];
  error?: string;
}

export interface EnrichmentResult {
  propertyId: string;
  success: boolean;
  owner1FirstName?: string;
  owner1LastName?: string;
  owner2FirstName?: string;
  owner2LastName?: string;
  phones: string[];
  emails: string[];
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  estimatedValue?: number;
  estimatedEquity?: number;
  lastSaleDate?: string;
  lastSaleAmount?: number;
  error?: string;
}

// Get today's date string for daily limit tracking
export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// Check daily usage
export async function getDailyUsage(): Promise<{ date: string; count: number; remaining: number }> {
  const today = getTodayKey();
  const key = ENRICHMENT_DAILY_KEY(today);
  const count = (await redis.get<number>(key)) || 0;
  return {
    date: today,
    count,
    remaining: Math.max(0, DAILY_LIMIT - count),
  };
}

// Increment daily usage
export async function incrementDailyUsage(amount: number): Promise<boolean> {
  const today = getTodayKey();
  const key = ENRICHMENT_DAILY_KEY(today);
  const currentCount = (await redis.get<number>(key)) || 0;

  if (currentCount + amount > DAILY_LIMIT) {
    return false;
  }

  await redis.incrby(key, amount);
  // Set expiry for 48 hours to auto-cleanup
  await redis.expire(key, 60 * 60 * 48);
  return true;
}

// Create enrichment job
export async function createEnrichmentJob(
  bucketId: string,
  bucketLabel: string,
  propertyIds: string[]
): Promise<EnrichmentJob> {
  const jobId = `enrich-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const totalBatches = Math.ceil(propertyIds.length / BATCH_SIZE);

  const job: EnrichmentJob = {
    id: jobId,
    bucketId,
    bucketLabel,
    propertyIds,
    status: "pending",
    createdAt: new Date().toISOString(),
    progress: {
      total: propertyIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      currentBatch: 0,
      totalBatches,
    },
    results: [],
  };

  // Store job in Redis
  await redis.set(ENRICHMENT_JOB_KEY(jobId), JSON.stringify(job));

  // Add to queue
  await redis.rpush(ENRICHMENT_QUEUE_KEY, jobId);

  // Add to jobs list
  await redis.zadd(ENRICHMENT_JOBS_KEY, { score: Date.now(), member: jobId });

  return job;
}

// Get job by ID
export async function getEnrichmentJob(jobId: string): Promise<EnrichmentJob | null> {
  const data = await redis.get<string>(ENRICHMENT_JOB_KEY(jobId));
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Update job
export async function updateEnrichmentJob(job: EnrichmentJob): Promise<void> {
  await redis.set(ENRICHMENT_JOB_KEY(job.id), JSON.stringify(job));
}

// Get all jobs (recent first)
export async function getEnrichmentJobs(limit = 50): Promise<EnrichmentJob[]> {
  const jobIds = await redis.zrange(ENRICHMENT_JOBS_KEY, 0, limit - 1, { rev: true });
  if (!jobIds || jobIds.length === 0) return [];

  const jobs = await Promise.all(
    jobIds.map((id) => getEnrichmentJob(id as string))
  );

  return jobs.filter((j): j is EnrichmentJob => j !== null);
}

// Get next job from queue
export async function getNextQueuedJob(): Promise<string | null> {
  const jobId = await redis.lpop<string>(ENRICHMENT_QUEUE_KEY);
  return jobId || null;
}
