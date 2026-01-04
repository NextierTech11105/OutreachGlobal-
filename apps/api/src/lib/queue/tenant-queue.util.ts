/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TENANT-SAFE QUEUE UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ensures all queue jobs are tenant-scoped and validated.
 * Every job MUST include a teamId in its data.
 * Consumers MUST validate teamId before processing.
 */

import { Queue, Job, JobsOptions } from "bullmq";
import { Logger } from "@nestjs/common";

const logger = new Logger("TenantQueue");

/**
 * Base interface for all tenant-scoped job data.
 * All queue job data MUST include teamId.
 */
export interface TenantJobData {
  teamId: string;
}

/**
 * Validates that job data includes a valid teamId.
 * Call this at the start of every consumer's process method.
 *
 * @throws Error if teamId is missing or invalid
 */
export function validateTenantJob<T extends TenantJobData>(
  job: Job<T>,
  queueName: string,
): asserts job is Job<T & { teamId: string }> {
  if (!job.data?.teamId) {
    logger.error(
      `[${queueName}] Job ${job.id} rejected: missing teamId in job data`,
      { jobName: job.name, jobId: job.id },
    );
    throw new Error(`Tenant isolation violation: job ${job.id} missing teamId`);
  }

  if (typeof job.data.teamId !== "string" || job.data.teamId.trim() === "") {
    logger.error(`[${queueName}] Job ${job.id} rejected: invalid teamId`, {
      jobName: job.name,
      jobId: job.id,
      teamId: job.data.teamId,
    });
    throw new Error(
      `Tenant isolation violation: job ${job.id} has invalid teamId`,
    );
  }
}

/**
 * Adds a job to a queue with mandatory teamId.
 * Use this wrapper instead of queue.add() directly to ensure tenant safety.
 */
export async function addTenantJob<T extends TenantJobData>(
  queue: Queue,
  jobName: string,
  data: T,
  options?: JobsOptions,
): Promise<Job<T>> {
  if (!data.teamId) {
    throw new Error(`Cannot add job to ${queue.name}: teamId is required`);
  }

  // Log for audit trail
  logger.debug(`[${queue.name}] Adding job ${jobName} for team ${data.teamId}`);

  return queue.add(jobName, data, options);
}

/**
 * Extracts teamId from job data safely.
 */
export function getJobTeamId(job: Job<TenantJobData>): string {
  if (!job.data?.teamId) {
    throw new Error(`Job ${job.id} has no teamId`);
  }
  return job.data.teamId;
}

/**
 * Decorator helper for logging tenant context in consumers.
 */
export function logTenantContext(
  queueName: string,
  job: Job<TenantJobData>,
  action: string,
): void {
  logger.log(
    `[${queueName}] ${action} - Job: ${job.id}, Team: ${job.data?.teamId}, Name: ${job.name}`,
  );
}

/**
 * Creates a tenant-scoped job ID.
 * Use this for job deduplication that respects tenant boundaries.
 */
export function createTenantJobId(teamId: string, uniquePart: string): string {
  return `${teamId}:${uniquePart}`;
}
