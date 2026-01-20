/**
 * AI Queue Consumer
 * Processes background AI tasks via BullMQ
 */

import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { AiOrchestratorService } from "../ai-orchestrator.service";
import { DeadLetterQueueService } from "@/lib/dlq";
import {
  validateTenantJob,
  logTenantContext,
} from "@/lib/queue/tenant-queue.util";
import {
  AI_QUEUE,
  AiJobs,
  ResearchDeepJobData,
  ResearchVerifyJobData,
  BatchClassifyJobData,
  BatchGenerateJobData,
  MeetingBriefJobData,
  AiJobData,
} from "../constants/ai-queue.constants";
import { AiContext } from "../providers";

@Processor(AI_QUEUE, {
  concurrency: 3, // Limit concurrent AI calls to avoid rate limits
  lockDuration: 60000, // 60s lock for longer AI operations
})
export class AiConsumer extends WorkerHost {
  private readonly logger = new Logger(AiConsumer.name);

  constructor(
    private orchestrator: AiOrchestratorService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(job: Job<AiJobData>) {
    // Validate tenant isolation
    validateTenantJob(job, AI_QUEUE);
    logTenantContext(AI_QUEUE, job, "Processing");

    this.logger.log(`Processing AI job: ${job.name} (${job.id})`);

    switch (job.name) {
      case AiJobs.RESEARCH_DEEP:
        return this.processResearchDeep(job as Job<ResearchDeepJobData>);

      case AiJobs.RESEARCH_VERIFY:
        return this.processResearchVerify(job as Job<ResearchVerifyJobData>);

      case AiJobs.BATCH_CLASSIFY:
        return this.processBatchClassify(job as Job<BatchClassifyJobData>);

      case AiJobs.BATCH_GENERATE:
        return this.processBatchGenerate(job as Job<BatchGenerateJobData>);

      case AiJobs.MEETING_BRIEF:
        return this.processMeetingBrief(job as Job<MeetingBriefJobData>);

      default:
        throw new Error(`Unknown AI job type: ${job.name}`);
    }
  }

  private async processResearchDeep(job: Job<ResearchDeepJobData>) {
    const { teamId, userId, leadId, traceId, query } = job.data;

    const context: AiContext = {
      teamId,
      userId,
      leadId,
      traceId,
      channel: "system",
    };

    const result = await this.orchestrator.researchDeep(context, query);

    this.logger.log(`Research deep completed: ${job.id}`);

    // If callback URL provided, POST result
    if (job.data.callbackUrl) {
      await this.sendCallback(job.data.callbackUrl, {
        jobId: job.id,
        type: AiJobs.RESEARCH_DEEP,
        status: "completed",
        result,
      });
    }

    return result;
  }

  private async processResearchVerify(job: Job<ResearchVerifyJobData>) {
    const {
      teamId,
      userId,
      leadId,
      traceId,
      businessName,
      businessAddress,
      ownerName,
    } = job.data;

    const context: AiContext = {
      teamId,
      userId,
      leadId,
      traceId,
      channel: "system",
    };

    // Build verification query
    const queryParts = [`Verify business: ${businessName}`];
    if (businessAddress) queryParts.push(`Address: ${businessAddress}`);
    if (ownerName) queryParts.push(`Owner: ${ownerName}`);
    queryParts.push(
      "Is this a legitimate operating business? Who is the owner? Any red flags?",
    );

    const result = await this.orchestrator.execute<
      { query: string },
      { verified: boolean; findings: string[]; confidence: number }
    >({
      task: "research_verify",
      priority: "background",
      context,
      input: { query: queryParts.join(". ") },
    });

    this.logger.log(`Research verify completed: ${job.id}`);

    if (job.data.callbackUrl) {
      await this.sendCallback(job.data.callbackUrl, {
        jobId: job.id,
        type: AiJobs.RESEARCH_VERIFY,
        status: "completed",
        result: result.output,
      });
    }

    return result.output;
  }

  private async processBatchClassify(job: Job<BatchClassifyJobData>) {
    const { teamId, userId, traceId, messages } = job.data;
    const results: Array<{
      id: string;
      intent: string;
      confidence: number;
      reasoning: string;
    }> = [];

    // Process in sequence to avoid rate limits
    for (const msg of messages) {
      const context: AiContext = {
        teamId,
        userId,
        leadId: msg.leadId,
        conversationId: msg.conversationId,
        traceId: `${traceId}-${msg.id}`,
        channel: "sms",
      };

      try {
        const result = await this.orchestrator.classifySms(
          context,
          msg.message,
          msg.conversationHistory,
        );
        results.push({ id: msg.id, ...result });
      } catch (error) {
        this.logger.error(
          `Batch classify failed for ${msg.id}: ${error instanceof Error ? error.message : "Unknown"}`,
        );
        results.push({
          id: msg.id,
          intent: "unknown",
          confidence: 0,
          reasoning: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
        });
      }

      // Update progress
      await job.updateProgress(
        Math.round((results.length / messages.length) * 100),
      );
    }

    this.logger.log(
      `Batch classify completed: ${job.id} (${results.length} messages)`,
    );

    if (job.data.callbackUrl) {
      await this.sendCallback(job.data.callbackUrl, {
        jobId: job.id,
        type: AiJobs.BATCH_CLASSIFY,
        status: "completed",
        results,
      });
    }

    return results;
  }

  private async processBatchGenerate(job: Job<BatchGenerateJobData>) {
    const { teamId, userId, traceId, requests } = job.data;
    const results: Array<{
      id: string;
      response: string;
      shouldEscalate: boolean;
    }> = [];

    for (const req of requests) {
      const context: AiContext = {
        teamId,
        userId,
        leadId: req.leadId,
        conversationId: req.conversationId,
        traceId: `${traceId}-${req.id}`,
        channel: "sms",
      };

      try {
        const result = await this.orchestrator.generateSmsResponse(context, {
          incomingMessage: req.incomingMessage,
          conversationHistory: req.conversationHistory,
          leadName: req.leadName,
          intent: req.intent,
        });
        results.push({ id: req.id, ...result });
      } catch (error) {
        this.logger.error(
          `Batch generate failed for ${req.id}: ${error instanceof Error ? error.message : "Unknown"}`,
        );
        results.push({
          id: req.id,
          response: "",
          shouldEscalate: true, // Escalate on error
        });
      }

      await job.updateProgress(
        Math.round((results.length / requests.length) * 100),
      );
    }

    this.logger.log(
      `Batch generate completed: ${job.id} (${results.length} responses)`,
    );

    if (job.data.callbackUrl) {
      await this.sendCallback(job.data.callbackUrl, {
        jobId: job.id,
        type: AiJobs.BATCH_GENERATE,
        status: "completed",
        results,
      });
    }

    return results;
  }

  private async processMeetingBrief(job: Job<MeetingBriefJobData>) {
    const {
      teamId,
      userId,
      leadId,
      traceId,
      meetingTime,
      attendees,
      context: meetingContext,
    } = job.data;

    const aiContext: AiContext = {
      teamId,
      userId,
      leadId,
      traceId,
      channel: "system",
    };

    const result = await this.orchestrator.execute<
      { meetingTime: string; attendees: string[]; context?: string },
      { brief: string; talkingPoints: string[]; questions: string[] }
    >({
      task: "meeting_brief",
      priority: "background",
      context: aiContext,
      input: { meetingTime, attendees, context: meetingContext },
    });

    this.logger.log(`Meeting brief completed: ${job.id}`);

    if (job.data.callbackUrl) {
      await this.sendCallback(job.data.callbackUrl, {
        jobId: job.id,
        type: AiJobs.MEETING_BRIEF,
        status: "completed",
        result: result.output,
      });
    }

    return result.output;
  }

  private async sendCallback(url: string, data: unknown): Promise<void> {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      this.logger.warn(
        `Callback failed: ${url} - ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }
  }

  @OnWorkerEvent("failed")
  async handleFailed(job: Job, error: Error) {
    this.logger.error(`AI job ${job.id} failed: ${error.message}`, error.stack);
    await this.dlqService.recordBullMQFailure(AI_QUEUE, job, error);
  }

  @OnWorkerEvent("completed")
  handleCompleted(job: Job) {
    this.logger.debug(`AI job ${job.id} completed`);
  }
}
