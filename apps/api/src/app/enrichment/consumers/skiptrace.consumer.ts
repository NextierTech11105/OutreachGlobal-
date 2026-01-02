/**
 * SkipTrace Consumer
 * Processes skip trace enrichment jobs
 */
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  SkipTraceService,
  SkipTraceEnrichmentJob,
} from "../services/skiptrace.service";
import { DeadLetterQueueService } from "@/lib/dlq";

const SKIPTRACE_QUEUE = "skiptrace";

@Processor(SKIPTRACE_QUEUE, { concurrency: 5, lockDuration: 30000 })
export class SkipTraceConsumer extends WorkerHost {
  private readonly logger = new Logger(SkipTraceConsumer.name);

  constructor(
    private skipTraceService: SkipTraceService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(job: Job<SkipTraceEnrichmentJob>): Promise<any> {
    this.logger.log(`Processing SkipTrace job ${job.id}: ${job.name}`);

    switch (job.name) {
      case "ENRICH_PERSONA":
        return this.enrichPersona(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Process single persona enrichment
   */
  private async enrichPersona(data: SkipTraceEnrichmentJob) {
    const result = await this.skipTraceService.enrichPersona(data);

    if (!result.success) {
      // Throw to trigger retry
      throw new Error(result.error || "SkipTrace enrichment failed");
    }

    return result;
  }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job) {
    this.logger.log(`SkipTrace job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `SkipTrace job ${job.id} failed: ${error.message}`,
      error.stack,
    );
    await this.dlqService.recordBullMQFailure(SKIPTRACE_QUEUE, job, error);
  }
}
