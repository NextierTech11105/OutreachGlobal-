/**
 * AI Queue Service
 * Submit async AI tasks to BullMQ
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, JobsOptions } from "bullmq";
import {
  AI_QUEUE,
  AiJobs,
  ResearchDeepJobData,
  ResearchVerifyJobData,
  BatchClassifyJobData,
  BatchGenerateJobData,
  MeetingBriefJobData,
} from "../constants/ai-queue.constants";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 50,
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
};

@Injectable()
export class AiQueueService {
  private readonly logger = new Logger(AiQueueService.name);

  constructor(@InjectQueue(AI_QUEUE) private aiQueue: Queue) {}

  /**
   * Queue a deep research task
   */
  async queueResearchDeep(
    data: ResearchDeepJobData,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.aiQueue.add(AiJobs.RESEARCH_DEEP, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    this.logger.log(`Queued research deep: ${job.id} for team ${data.teamId}`);
    return job.id!;
  }

  /**
   * Queue a business verification task
   */
  async queueResearchVerify(
    data: ResearchVerifyJobData,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.aiQueue.add(AiJobs.RESEARCH_VERIFY, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    this.logger.log(
      `Queued research verify: ${job.id} for team ${data.teamId}`,
    );
    return job.id!;
  }

  /**
   * Queue batch SMS classification
   */
  async queueBatchClassify(
    data: BatchClassifyJobData,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.aiQueue.add(AiJobs.BATCH_CLASSIFY, data, {
      ...DEFAULT_JOB_OPTIONS,
      // Longer timeout for batch operations
      ...options,
    });

    this.logger.log(
      `Queued batch classify: ${job.id} (${data.messages.length} messages) for team ${data.teamId}`,
    );
    return job.id!;
  }

  /**
   * Queue batch SMS response generation
   */
  async queueBatchGenerate(
    data: BatchGenerateJobData,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.aiQueue.add(AiJobs.BATCH_GENERATE, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    this.logger.log(
      `Queued batch generate: ${job.id} (${data.requests.length} requests) for team ${data.teamId}`,
    );
    return job.id!;
  }

  /**
   * Queue meeting brief generation
   */
  async queueMeetingBrief(
    data: MeetingBriefJobData,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.aiQueue.add(AiJobs.MEETING_BRIEF, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
    });

    this.logger.log(`Queued meeting brief: ${job.id} for team ${data.teamId}`);
    return job.id!;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    result?: unknown;
    error?: string;
  } | null> {
    const job = await this.aiQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();

    return {
      id: job.id!,
      status: state,
      progress: job.progress as number,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.aiQueue.getWaitingCount(),
      this.aiQueue.getActiveCount(),
      this.aiQueue.getCompletedCount(),
      this.aiQueue.getFailedCount(),
      this.aiQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.aiQueue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === "waiting" || state === "delayed") {
      await job.remove();
      this.logger.log(`Cancelled AI job: ${jobId}`);
      return true;
    }

    return false;
  }
}
