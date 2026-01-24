import { Injectable, Logger } from "@nestjs/common";
import { ulid } from "ulid";

export interface JobStatus {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  current: number;
  total: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JobData {
  status: JobStatus;
  metadata: any;
}

@Injectable()
export class CopilotJobService {
  private readonly logger = new Logger(CopilotJobService.name);
  private jobs = new Map<string, JobData>();

  /**
   * Create a new job
   */
  async createJob(action: string, metadata?: any): Promise<string> {
    const jobId = `job_${ulid()}`;

    this.jobs.set(jobId, {
      status: {
        jobId,
        status: "pending",
        progress: 0,
        current: 0,
        total: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      metadata: {
        action,
        ...metadata,
      },
    });

    this.logger.log(`Created job ${jobId} for action: ${action}`);
    return jobId;
  }

  /**
   * Get job status
   */
  async getStatus(jobId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return {
        jobId,
        status: "failed",
        progress: 0,
        current: 0,
        total: 0,
        error: "Job not found",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return job.status;
  }

  /**
   * Update job status
   */
  async updateStatus(
    jobId: string,
    status: "pending" | "running" | "completed" | "failed",
    progress: number,
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status.status = status;
      job.status.progress = progress;
      job.status.updatedAt = new Date();
    }
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status.progress = progress;
      job.status.updatedAt = new Date();
    }
  }

  /**
   * Mark job as completed
   */
  async complete(jobId: string, result: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status.status = "completed";
      job.status.progress = 100;
      job.status.result = result;
      job.status.updatedAt = new Date();
      this.logger.log(`Job ${jobId} completed`);
    }
  }

  /**
   * Mark job as failed
   */
  async fail(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status.status = "failed";
      job.status.error = error;
      job.status.updatedAt = new Date();
      this.logger.error(`Job ${jobId} failed: ${error}`);
    }
  }

  /**
   * Clean up old jobs (called periodically)
   */
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status.updatedAt < oneHourAgo) {
        this.jobs.delete(jobId);
      }
    }
  }
}
