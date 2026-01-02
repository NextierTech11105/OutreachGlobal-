import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { deadLetterQueue, DeadLetterStatus } from "@/database/schema";
import { eq, and, lt } from "drizzle-orm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { DEFAULT_JOB_OPTIONS } from "@/lib/bullmq";

const MAX_RETRY_COUNT = 3;

@Injectable()
export class DLQRetryScheduler {
  private readonly logger = new Logger(DLQRetryScheduler.name);

  private queues: Map<string, Queue> = new Map();

  constructor(@InjectDB() private db: DrizzleClient) {}

  registerQueue(name: string, queue: Queue) {
    this.queues.set(name, queue);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryPendingJobs() {
    this.logger.log("Starting DLQ retry cycle");

    const pendingEntries = await this.db.query.deadLetterQueue.findMany({
      where: and(
        eq(deadLetterQueue.status, "pending"),
        lt(deadLetterQueue.retryCount, MAX_RETRY_COUNT),
      ),
      limit: 50,
    });

    if (pendingEntries.length === 0) {
      this.logger.debug("No pending DLQ entries to retry");
      return;
    }

    this.logger.log(`Found ${pendingEntries.length} DLQ entries to retry`);

    let successCount = 0;
    let failureCount = 0;

    for (const entry of pendingEntries) {
      try {
        const queue = this.queues.get(entry.originalQueue);

        if (!queue) {
          this.logger.warn(
            `Queue ${entry.originalQueue} not registered for retry`,
          );
          continue;
        }

        await queue.add(entry.jobName || "retry", entry.jobData || {}, {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `dlq-retry-${entry.id}-${entry.retryCount + 1}`,
        });

        await this.db
          .update(deadLetterQueue)
          .set({
            status: "retried" as DeadLetterStatus,
            retryCount: entry.retryCount + 1,
            lastRetryAt: new Date(),
          })
          .where(eq(deadLetterQueue.id, entry.id));

        successCount++;
        this.logger.log(
          `Retried DLQ entry ${entry.id} to queue ${entry.originalQueue}`,
        );
      } catch (error) {
        failureCount++;
        this.logger.error(
          `Failed to retry DLQ entry ${entry.id}: ${(error as Error).message}`,
        );
      }
    }

    const expiredEntries = await this.db.query.deadLetterQueue.findMany({
      where: and(
        eq(deadLetterQueue.status, "pending"),
        eq(deadLetterQueue.retryCount, MAX_RETRY_COUNT),
      ),
      limit: 100,
    });

    if (expiredEntries.length > 0) {
      for (const entry of expiredEntries) {
        await this.db
          .update(deadLetterQueue)
          .set({
            status: "failed" as DeadLetterStatus,
            resolvedAt: new Date(),
            resolutionNotes: `Exhausted ${MAX_RETRY_COUNT} retry attempts`,
          })
          .where(eq(deadLetterQueue.id, entry.id));
      }
      this.logger.warn(
        `Marked ${expiredEntries.length} DLQ entries as failed after exhausting retries`,
      );
    }

    this.logger.log(
      `DLQ retry cycle complete: ${successCount} retried, ${failureCount} failed`,
    );
  }
}
