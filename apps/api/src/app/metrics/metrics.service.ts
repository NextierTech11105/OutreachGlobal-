import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { DeadLetterQueueService } from "@/lib/dlq";

// Queue names used in the system
const QUEUE_NAMES = [
  "mail",
  "campaign",
  "campaign-sequence",
  "lead",
  "integration-task",
  "b2b-ingestion",
  "lead-card",
  "skiptrace",
] as const;

export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface MetricsData {
  queues: QueueMetrics[];
  dlq: {
    total: number;
    byQueue: Record<string, number>;
  };
  timestamp: string;
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private queues: Map<string, Queue> = new Map();
  private redisUrl: string | undefined;

  constructor(
    private readonly dlqService: DeadLetterQueueService,
    private readonly configService: ConfigService,
  ) {
    this.redisUrl = this.configService.get<string>("REDIS_URL");
  }

  async onModuleInit() {
    // Initialize queue connections for metrics collection
    if (!this.redisUrl) {
      this.logger.warn("REDIS_URL not configured, queue metrics unavailable");
      return;
    }

    for (const name of QUEUE_NAMES) {
      try {
        const queue = new Queue(name, {
          connection: { url: this.redisUrl },
          prefix: "nextier_jobs",
        });
        this.queues.set(name, queue);
      } catch (error) {
        this.logger.warn(`Failed to connect to queue ${name}: ${error}`);
      }
    }

    this.logger.log(`Metrics initialized for ${this.queues.size} queues`);
  }

  /**
   * Get metrics for all registered queues
   */
  async getQueueMetrics(): Promise<QueueMetrics[]> {
    const metrics: QueueMetrics[] = [];

    for (const [name, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed, delayed, isPaused] =
          await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
            queue.isPaused(),
          ]);

        metrics.push({
          name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused: isPaused,
        });
      } catch (error) {
        this.logger.warn(`Failed to get metrics for queue ${name}: ${error}`);
        metrics.push({
          name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: false,
        });
      }
    }

    return metrics;
  }

  /**
   * Get all metrics data
   */
  async getAllMetrics(): Promise<MetricsData> {
    const [queueMetrics, dlqStats] = await Promise.all([
      this.getQueueMetrics(),
      this.dlqService.getStats(),
    ]);

    return {
      queues: queueMetrics,
      dlq: dlqStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    const data = await this.getAllMetrics();
    const lines: string[] = [];

    // Queue metrics
    lines.push("# HELP nextier_queue_waiting Number of waiting jobs in queue");
    lines.push("# TYPE nextier_queue_waiting gauge");
    for (const q of data.queues) {
      lines.push(`nextier_queue_waiting{queue="${q.name}"} ${q.waiting}`);
    }

    lines.push("");
    lines.push("# HELP nextier_queue_active Number of active jobs in queue");
    lines.push("# TYPE nextier_queue_active gauge");
    for (const q of data.queues) {
      lines.push(`nextier_queue_active{queue="${q.name}"} ${q.active}`);
    }

    lines.push("");
    lines.push(
      "# HELP nextier_queue_completed Total completed jobs in queue",
    );
    lines.push("# TYPE nextier_queue_completed counter");
    for (const q of data.queues) {
      lines.push(`nextier_queue_completed{queue="${q.name}"} ${q.completed}`);
    }

    lines.push("");
    lines.push("# HELP nextier_queue_failed Total failed jobs in queue");
    lines.push("# TYPE nextier_queue_failed counter");
    for (const q of data.queues) {
      lines.push(`nextier_queue_failed{queue="${q.name}"} ${q.failed}`);
    }

    lines.push("");
    lines.push("# HELP nextier_queue_delayed Number of delayed jobs in queue");
    lines.push("# TYPE nextier_queue_delayed gauge");
    for (const q of data.queues) {
      lines.push(`nextier_queue_delayed{queue="${q.name}"} ${q.delayed}`);
    }

    lines.push("");
    lines.push("# HELP nextier_queue_paused Whether queue is paused (1=yes)");
    lines.push("# TYPE nextier_queue_paused gauge");
    for (const q of data.queues) {
      lines.push(`nextier_queue_paused{queue="${q.name}"} ${q.paused ? 1 : 0}`);
    }

    // DLQ metrics
    lines.push("");
    lines.push("# HELP nextier_dlq_total Total entries in dead letter queue");
    lines.push("# TYPE nextier_dlq_total gauge");
    lines.push(`nextier_dlq_total ${data.dlq.total}`);

    lines.push("");
    lines.push(
      "# HELP nextier_dlq_by_queue DLQ entries by original queue name",
    );
    lines.push("# TYPE nextier_dlq_by_queue gauge");
    for (const [queue, count] of Object.entries(data.dlq.byQueue)) {
      lines.push(`nextier_dlq_by_queue{queue="${queue}"} ${count}`);
    }

    return lines.join("\n");
  }
}
