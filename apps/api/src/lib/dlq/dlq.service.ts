import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { deadLetterQueue, DeadLetterStatus } from "@/database/schema";
import { Job } from "bullmq";
import { eq, and, desc } from "drizzle-orm";

export interface DLQEntry {
  originalQueue: string;
  jobId?: string;
  jobName?: string;
  jobData?: Record<string, unknown>;
  errorMessage: string;
  errorStack?: string;
  attemptsMade?: number;
  teamId?: string;
}

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Record a failed job in the dead letter queue
   */
  async recordFailure(entry: DLQEntry): Promise<string> {
    const [record] = await this.db
      .insert(deadLetterQueue)
      .values({
        originalQueue: entry.originalQueue,
        jobId: entry.jobId,
        jobName: entry.jobName,
        jobData: entry.jobData,
        errorMessage: entry.errorMessage,
        errorStack: entry.errorStack,
        attemptsMade: entry.attemptsMade || 0,
        teamId: entry.teamId,
      })
      .returning({ id: deadLetterQueue.id });

    this.logger.warn(
      `Job failed and sent to DLQ: queue=${entry.originalQueue} jobId=${entry.jobId} error=${entry.errorMessage}`,
    );

    return record.id;
  }

  /**
   * Helper to record a BullMQ job failure
   */
  async recordBullMQFailure(
    queueName: string,
    job: Job,
    error: Error,
  ): Promise<string> {
    return this.recordFailure({
      originalQueue: queueName,
      jobId: job.id,
      jobName: job.name,
      jobData: job.data as Record<string, unknown>,
      errorMessage: error.message || String(error),
      errorStack: error.stack,
      attemptsMade: job.attemptsMade,
      teamId: (job.data as { teamId?: string })?.teamId,
    });
  }

  /**
   * Get pending DLQ entries
   */
  async getPending(limit = 100) {
    return this.db.query.deadLetterQueue.findMany({
      where: eq(deadLetterQueue.status, "pending"),
      orderBy: desc(deadLetterQueue.failedAt),
      limit,
    });
  }

  /**
   * Get DLQ entries by queue name
   */
  async getByQueue(queueName: string, limit = 100) {
    return this.db.query.deadLetterQueue.findMany({
      where: eq(deadLetterQueue.originalQueue, queueName),
      orderBy: desc(deadLetterQueue.failedAt),
      limit,
    });
  }

  /**
   * Get DLQ stats by queue
   */
  async getStats() {
    const entries = await this.db.query.deadLetterQueue.findMany({
      where: eq(deadLetterQueue.status, "pending"),
    });

    const stats: Record<string, number> = {};
    for (const entry of entries) {
      stats[entry.originalQueue] = (stats[entry.originalQueue] || 0) + 1;
    }

    return {
      total: entries.length,
      byQueue: stats,
    };
  }

  /**
   * Mark a DLQ entry as resolved
   */
  async resolve(id: string, resolvedBy: string, notes?: string): Promise<void> {
    await this.db
      .update(deadLetterQueue)
      .set({
        status: "resolved" as DeadLetterStatus,
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes: notes,
      })
      .where(eq(deadLetterQueue.id, id));
  }

  /**
   * Mark a DLQ entry as ignored
   */
  async ignore(id: string, resolvedBy: string, notes?: string): Promise<void> {
    await this.db
      .update(deadLetterQueue)
      .set({
        status: "ignored" as DeadLetterStatus,
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes: notes,
      })
      .where(eq(deadLetterQueue.id, id));
  }

  /**
   * Mark entry as retried
   */
  async markRetried(id: string): Promise<void> {
    const entry = await this.db.query.deadLetterQueue.findFirst({
      where: eq(deadLetterQueue.id, id),
    });

    if (entry) {
      await this.db
        .update(deadLetterQueue)
        .set({
          status: "retried" as DeadLetterStatus,
          retryCount: entry.retryCount + 1,
          lastRetryAt: new Date(),
        })
        .where(eq(deadLetterQueue.id, id));
    }
  }
}
