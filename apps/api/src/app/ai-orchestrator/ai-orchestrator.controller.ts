/**
 * AI Orchestrator Controller
 * REST endpoints for AI operations
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { UsageMeterService } from "./usage";
import { AiQueueService } from "./services/ai-queue.service";
import { AiTask, AiPriority, AiContext } from "./providers";
import { TenantContext, CorrelationId } from "@/app/auth/decorators";
import { CombinedAuthGuard } from "@/app/auth/guards/combined-auth.guard";

interface ExecuteRequestDto {
  task: AiTask;
  priority?: AiPriority;
  input: unknown;
  promptKey?: string;
  idempotencyKey?: string;
  maxLatencyMs?: number;
  maxCostUsd?: number;
  leadId?: string;
  conversationId?: string;
  channel?: "sms" | "web" | "system";
}

interface ClassifySmsDto {
  message: string;
  conversationHistory?: string[];
  leadId?: string;
  conversationId?: string;
}

interface GenerateSmsDto {
  incomingMessage: string;
  conversationHistory: string[];
  leadName: string;
  intent?: string;
  leadId?: string;
  conversationId?: string;
}

interface ResearchDto {
  query: string;
  leadId?: string;
}

@Controller("ai")
@UseGuards(CombinedAuthGuard)
export class AiOrchestratorController {
  private readonly logger = new Logger(AiOrchestratorController.name);

  constructor(
    private orchestrator: AiOrchestratorService,
    private usageMeter: UsageMeterService,
    private aiQueue: AiQueueService,
  ) {}

  /**
   * Generic execute endpoint for any AI task
   */
  @Post("execute")
  async execute(
    @Body() body: ExecuteRequestDto,
    @TenantContext("teamId") teamId: string,
    @TenantContext("userId") userId: string,
    @CorrelationId() traceId: string,
  ) {
    const context: AiContext = {
      teamId,
      userId,
      leadId: body.leadId,
      conversationId: body.conversationId,
      traceId,
      channel: body.channel || "web",
    };

    try {
      const result = await this.orchestrator.execute({
        task: body.task,
        priority: body.priority || "interactive",
        context,
        input: body.input,
        promptKey: body.promptKey,
        idempotencyKey: body.idempotencyKey,
        maxLatencyMs: body.maxLatencyMs,
        maxCostUsd: body.maxCostUsd,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Execute failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "AI execution failed",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * SMS classification endpoint
   */
  @Post("classify-sms")
  async classifySms(
    @Body() body: ClassifySmsDto,
    @TenantContext("teamId") teamId: string,
    @TenantContext("userId") userId: string,
    @CorrelationId() traceId: string,
  ) {
    const context: AiContext = {
      teamId,
      userId,
      leadId: body.leadId,
      conversationId: body.conversationId,
      traceId,
      channel: "sms",
    };

    try {
      const result = await this.orchestrator.classifySms(
        context,
        body.message,
        body.conversationHistory,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Classify SMS failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "SMS classification failed",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * SMS response generation endpoint
   */
  @Post("generate-sms")
  async generateSms(
    @Body() body: GenerateSmsDto,
    @TenantContext("teamId") teamId: string,
    @TenantContext("userId") userId: string,
    @CorrelationId() traceId: string,
  ) {
    const context: AiContext = {
      teamId,
      userId,
      leadId: body.leadId,
      conversationId: body.conversationId,
      traceId,
      channel: "sms",
    };

    try {
      const result = await this.orchestrator.generateSmsResponse(context, {
        incomingMessage: body.incomingMessage,
        conversationHistory: body.conversationHistory,
        leadName: body.leadName,
        intent: body.intent,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Generate SMS failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "SMS response generation failed",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Deep research endpoint
   */
  @Post("research")
  async research(
    @Body() body: ResearchDto,
    @TenantContext("teamId") teamId: string,
    @TenantContext("userId") userId: string,
    @CorrelationId() traceId: string,
  ) {
    const context: AiContext = {
      teamId,
      userId,
      leadId: body.leadId,
      traceId,
      channel: "system",
    };

    try {
      const result = await this.orchestrator.researchDeep(context, body.query);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Research failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Research failed",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get usage summary for the team
   */
  @Get("usage")
  async getUsage(
    @TenantContext("teamId") teamId: string,
    @Query("period") period: "day" | "month" = "month",
  ) {
    try {
      const summary = await this.usageMeter.getUsageSummary(teamId, period);
      const limits = await this.usageMeter.checkLimits(teamId);

      return {
        success: true,
        data: {
          summary,
          limits: {
            allowed: limits.allowed,
            percentUsed: limits.percentUsed,
            limits: limits.limits,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Get usage failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get usage",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASYNC QUEUE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Queue async research (background processing)
   */
  @Post("queue/research")
  async queueResearch(
    @Body() body: { query: string; leadId?: string; callbackUrl?: string },
    @TenantContext("teamId") teamId: string,
    @TenantContext("userId") userId: string,
    @CorrelationId() traceId: string,
  ) {
    try {
      const jobId = await this.aiQueue.queueResearchDeep({
        teamId,
        userId,
        leadId: body.leadId,
        traceId,
        query: body.query,
        callbackUrl: body.callbackUrl,
      });

      return {
        success: true,
        data: { jobId, status: "queued" },
      };
    } catch (error) {
      this.logger.error(
        `Queue research failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to queue research",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Queue batch SMS classification
   */
  @Post("queue/batch-classify")
  async queueBatchClassify(
    @Body()
    body: {
      messages: Array<{
        id: string;
        leadId: string;
        conversationId?: string;
        message: string;
        conversationHistory?: string[];
      }>;
      callbackUrl?: string;
    },
    @TenantContext("teamId") teamId: string,
    @TenantContext("userId") userId: string,
    @CorrelationId() traceId: string,
  ) {
    try {
      const jobId = await this.aiQueue.queueBatchClassify({
        teamId,
        userId,
        traceId,
        messages: body.messages,
        callbackUrl: body.callbackUrl,
      });

      return {
        success: true,
        data: { jobId, status: "queued", messageCount: body.messages.length },
      };
    } catch (error) {
      this.logger.error(
        `Queue batch classify failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to queue batch classify",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get job status
   */
  @Get("queue/job/:jobId")
  async getJobStatus(@Param("jobId") jobId: string) {
    try {
      const status = await this.aiQueue.getJobStatus(jobId);

      if (!status) {
        throw new HttpException(
          { success: false, error: "Job not found" },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Get job status failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get job status",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get queue stats
   */
  @Get("queue/stats")
  async getQueueStats() {
    try {
      const stats = await this.aiQueue.getQueueStats();
      return { success: true, data: stats };
    } catch (error) {
      this.logger.error(
        `Get queue stats failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get queue stats",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK & DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Health check for all AI providers
   * Returns circuit breaker state for each provider
   */
  @Get("health")
  async healthCheck() {
    try {
      const health = await this.orchestrator.healthCheck();
      return { success: true, data: health };
    } catch (error) {
      this.logger.error(
        `Health check failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Health check failed",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Usage dashboard with aggregated stats
   */
  @Get("usage/dashboard")
  async getUsageDashboard(
    @TenantContext("teamId") teamId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    try {
      const dashboard = await this.orchestrator.getUsageDashboard(
        teamId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return { success: true, data: dashboard };
    } catch (error) {
      this.logger.error(
        `Get usage dashboard failed: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get usage dashboard",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
