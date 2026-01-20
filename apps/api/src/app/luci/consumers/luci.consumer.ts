/**
 * LUCI Engine Consumer
 * Background job processor for data pipeline
 *
 * Pipeline: Import → Skip Trace → Score → Qualify → Ready
 * Status flow: raw → traced → scored → ready/rejected
 */

import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { LuciService, PipelineConfig } from "../luci.service";
import { DeadLetterQueueService } from "@/lib/dlq";
import { LUCI_QUEUE, LuciJobs, PipelineStatus } from "../constants";

interface FullPipelineJobData {
  batchId: string;
  teamId: string;
  csvBuffer: string; // base64 encoded
  columnMapping: {
    address: string;
    city: string;
    state: string;
    zip?: string;
    firstName: string;
    lastName: string;
    mailAddress: string;
    mailCity: string;
    mailState: string;
    mailingZip?: string;
  };
  config: PipelineConfig;
}

interface SkipTraceJobData {
  teamId: string;
  leadIds: string[];
  traceType: "normal" | "enhanced";
}

interface ScoreContactsJobData {
  teamId: string;
  leadIds: string[];
}

type LuciJobData =
  | FullPipelineJobData
  | SkipTraceJobData
  | ScoreContactsJobData;

@Processor(LUCI_QUEUE, {
  concurrency: 2, // Limit concurrent jobs
  lockDuration: 300000, // 5 min lock for long operations
})
export class LuciConsumer extends WorkerHost {
  private readonly logger = new Logger(LuciConsumer.name);

  constructor(
    private luciService: LuciService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(job: Job<LuciJobData>) {
    this.logger.log(`[LUCI] Processing job: ${job.name} (${job.id})`);

    switch (job.name) {
      case LuciJobs.FULL_PIPELINE:
        return this.processFullPipeline(job as Job<FullPipelineJobData>);

      case LuciJobs.SKIP_TRACE:
        return this.processSkipTrace(job as Job<SkipTraceJobData>);

      case LuciJobs.SCORE_CONTACTS:
        return this.processScoreContacts(job as Job<ScoreContactsJobData>);

      default:
        throw new Error(`Unknown LUCI job type: ${job.name}`);
    }
  }

  /**
   * Full pipeline: Import → Trace → Score → Qualify → Ready
   */
  private async processFullPipeline(job: Job<FullPipelineJobData>) {
    const { batchId, teamId, csvBuffer, columnMapping, config } = job.data;

    this.logger.log(`[LUCI] Starting full pipeline for batch ${batchId}`);

    try {
      // Decode CSV buffer
      const csvData = Buffer.from(csvBuffer, "base64");

      // Update progress: Starting
      await job.updateProgress(10);

      // Execute pipeline
      const result = await this.luciService.executePipeline(
        teamId,
        csvData,
        columnMapping,
        config,
      );

      // Update progress: Complete
      await job.updateProgress(100);

      this.logger.log(
        `[LUCI] Pipeline complete: ${result.stats.smsReadyCount} SMS-ready of ${result.stats.totalRecords}`,
      );

      return {
        batchId,
        status: PipelineStatus.READY,
        stats: result.stats,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `[LUCI] Pipeline failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw error;
    }
  }

  /**
   * Skip trace only (for reprocessing)
   */
  private async processSkipTrace(job: Job<SkipTraceJobData>) {
    const { teamId, leadIds, traceType } = job.data;

    this.logger.log(
      `[LUCI] Skip tracing ${leadIds.length} leads for team ${teamId}`,
    );

    // TODO: Fetch lead data, build CSV, run trace
    await job.updateProgress(100);

    return {
      teamId,
      tracedCount: leadIds.length,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Score contacts only (for reprocessing)
   */
  private async processScoreContacts(job: Job<ScoreContactsJobData>) {
    const { teamId, leadIds } = job.data;

    this.logger.log(
      `[LUCI] Scoring ${leadIds.length} contacts for team ${teamId}`,
    );

    // TODO: Fetch traced leads, run Trestle scoring
    await job.updateProgress(100);

    return {
      teamId,
      scoredCount: leadIds.length,
      completedAt: new Date().toISOString(),
    };
  }

  @OnWorkerEvent("failed")
  async handleFailed(job: Job, error: Error) {
    this.logger.error(`[LUCI] Job ${job.id} failed: ${error.message}`);
    await this.dlqService.recordBullMQFailure(LUCI_QUEUE, job, error);
  }

  @OnWorkerEvent("completed")
  handleCompleted(job: Job) {
    this.logger.log(`[LUCI] Job ${job.id} completed`);
  }

  @OnWorkerEvent("progress")
  handleProgress(job: Job, progress: number) {
    this.logger.debug(`[LUCI] Job ${job.id} progress: ${progress}%`);
  }
}
