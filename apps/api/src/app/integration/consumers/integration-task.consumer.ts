import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  INTEGRATION_TASK_QUEUE,
  IntegrationTaskJob,
} from "../constants/integration-task.constants";
import { IntegrationTaskSelect } from "../models/integration-task.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { IntegrationTaskService } from "../services/integration-task.service";
import { IntegrationService } from "../services/integration.service";
import { orFail } from "@/database/exceptions";
import { DeadLetterQueueService } from "@/lib/dlq";

type JobData = Job<{ task: IntegrationTaskSelect }>;

@Processor(INTEGRATION_TASK_QUEUE, { concurrency: 5, lockDuration: 30000 })
export class IntegrationTaskConsumer extends WorkerHost {
  private readonly logger = new Logger(IntegrationTaskConsumer.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private service: IntegrationTaskService,
    private integrationService: IntegrationService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(job: JobData) {
    this.logger.log(
      `[${INTEGRATION_TASK_QUEUE}] Processing job ${job.id}: ${job.name}`,
    );

    if (job.name === IntegrationTaskJob.SYNC_LEAD) {
      await this.syncLead(job.data);
    }
  }

  async syncLead({ task }: JobData["data"]) {
    const integration = await this.db.query.integrations
      .findFirst({
        where: (t, { eq }) => eq(t.id, task.integrationId),
      })
      .then(orFail("integration"));

    // TODO: Add provider-specific sync logic here
    this.logger.log(`Sync lead task for integration: ${integration.name}`);
    throw new Error(`Provider ${integration.name} sync not yet implemented`);
  }

  @OnWorkerEvent("failed")
  async handleFailed(job: JobData, error: Error) {
    this.logger.error(
      `Integration task ${job.data.task?.id} failed: ${error.message}`,
      error.stack,
    );
    await this.dlqService.recordBullMQFailure(
      INTEGRATION_TASK_QUEUE,
      job,
      error,
    );
    if (job.data.task?.id) {
      await this.service.setStatus({ id: job.data.task.id, status: "FAILED" });
    }
  }

  @OnWorkerEvent("completed")
  async handleCompleted(job: JobData) {
    if (job.data.task.id) {
      await this.service.setStatus({
        id: job.data.task.id,
        status: "COMPLETED",
      });
    }
  }
}
