import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { TenantContext } from "@/app/auth/decorators";
import { CombinedAuthGuard } from "@/app/auth/guards/combined-auth.guard";
import { CopilotService, ChatResponse } from "./copilot.service";
import { CopilotJobService, JobStatus } from "./jobs/copilot-job.service";

interface ChatRequestBody {
  message: string;
  conversationId?: string;
  surface?: "sectors" | "leads" | "campaigns";
}

@Controller("copilot")
@UseGuards(CombinedAuthGuard)
export class CopilotController {
  private readonly logger = new Logger(CopilotController.name);

  constructor(
    private readonly copilotService: CopilotService,
    private readonly jobService: CopilotJobService,
  ) {}

  /**
   * POST /copilot/chat
   * Send a message, get a response (may start async job)
   */
  @Post("chat")
  @HttpCode(HttpStatus.OK)
  async chat(
    @TenantContext("teamId") teamId: string,
    @Body() body: ChatRequestBody,
  ): Promise<ChatResponse> {
    this.logger.log(`Chat from team ${teamId}: "${body.message.substring(0, 50)}..."`);

    return this.copilotService.chat(teamId, body.message, {
      conversationId: body.conversationId,
      surface: body.surface,
    });
  }

  /**
   * GET /copilot/jobs/:jobId
   * Poll for async job status
   */
  @Get("jobs/:jobId")
  async getJobStatus(@Param("jobId") jobId: string): Promise<JobStatus> {
    return this.jobService.getStatus(jobId);
  }

  /**
   * GET /copilot/health
   */
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "copilot",
      description: "Conversational AI for lead enrichment",
    };
  }
}
