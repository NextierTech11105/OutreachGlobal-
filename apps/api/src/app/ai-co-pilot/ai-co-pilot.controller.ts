import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ResponseGeneratorService } from "./services/response-generator.service";
import { AutoRespondService, AutoRespondResult } from "./services/auto-respond.service";
import {
  CoPilotResponse,
  PhoneConfig,
} from "./models/response-suggestion.model";

interface GenerateRequestBody {
  teamId: string;
  phoneNumber: string;
  message: string;
  conversationId: string;
  maxSuggestions?: number;
}

interface WebhookInboundBody {
  from: string;
  to: string;
  body: string;
  messageId?: string;
  timestamp?: string;
}

interface AutoRespondRequestBody {
  teamId: string;
  fromPhone: string;
  toPhone: string;
  message: string;
  leadId?: string;
}

@Controller("ai-co-pilot")
export class AiCoPilotController {
  private readonly logger = new Logger(AiCoPilotController.name);

  constructor(
    private responseGenerator: ResponseGeneratorService,
    private autoRespond: AutoRespondService,
  ) {}

  /**
   * Generate response suggestions via REST API
   * POST /ai-co-pilot/generate
   */
  @Post("generate")
  @HttpCode(HttpStatus.OK)
  async generateResponses(
    @Body() body: GenerateRequestBody,
  ): Promise<CoPilotResponse> {
    this.logger.log(
      `Generating responses for ${body.phoneNumber} in conversation ${body.conversationId}`,
    );

    return this.responseGenerator.generateResponses(
      body.teamId,
      body.phoneNumber,
      body.message,
      body.conversationId,
      {
        maxSuggestions: body.maxSuggestions || 3,
        includeReasoning: true,
      },
    );
  }

  /**
   * Get phone configuration
   * GET /ai-co-pilot/phone-config?phoneNumber=xxx
   */
  @Get("phone-config")
  async getPhoneConfig(
    @Query("phoneNumber") phoneNumber: string,
  ): Promise<PhoneConfig | null> {
    return this.responseGenerator.getPhoneConfig(phoneNumber);
  }

  /**
   * Process inbound SMS and generate suggestions
   * Called by webhook handler to trigger co-pilot
   * POST /ai-co-pilot/inbound
   */
  @Post("inbound")
  @HttpCode(HttpStatus.OK)
  async processInbound(
    @Body() body: WebhookInboundBody,
  ): Promise<{ triggered: boolean; config?: PhoneConfig; error?: string }> {
    this.logger.log(`Processing inbound from ${body.from} to ${body.to}`);

    // Get phone config to determine team and settings
    const config = await this.responseGenerator.getPhoneConfig(body.to);

    if (!config) {
      this.logger.warn(`No config found for phone ${body.to}`);
      return {
        triggered: false,
        error: `No configuration found for phone number ${body.to}`,
      };
    }

    if (!config.coPilotEnabled) {
      this.logger.log(`Co-Pilot disabled for ${body.to}`);
      return {
        triggered: false,
        config,
        error: "Co-Pilot is disabled for this number",
      };
    }

    // Co-Pilot is enabled - suggestions will be generated on-demand
    // via the GraphQL API when the user views the conversation
    this.logger.log(
      `Co-Pilot ready for ${body.to} (team: ${config.teamId}, agent: ${config.aiAgent})`,
    );

    return {
      triggered: true,
      config,
    };
  }

  /**
   * Auto-respond to inbound message with rebuttal or calendar link
   * POST /ai-co-pilot/auto-respond
   */
  @Post("auto-respond")
  @HttpCode(HttpStatus.OK)
  async autoRespondToMessage(@Body() body: AutoRespondRequestBody): Promise<AutoRespondResult> {
    this.logger.log(
      `Auto-responding to ${body.fromPhone}: "${body.message.substring(0, 50)}..."`,
    );

    return this.autoRespond.processAndRespond(
      body.teamId,
      body.fromPhone,
      body.toPhone,
      body.message,
      body.leadId,
    );
  }

  /**
   * Check if message indicates booking consent
   * POST /ai-co-pilot/detect-consent
   */
  @Post("detect-consent")
  @HttpCode(HttpStatus.OK)
  detectBookingConsent(
    @Body() body: { message: string },
  ): { hasConsent: boolean } {
    return {
      hasConsent: this.autoRespond.detectBookingConsent(body.message),
    };
  }

  /**
   * Get calendar link for team
   * GET /ai-co-pilot/calendar-link?teamId=xxx
   */
  @Get("calendar-link")
  async getCalendarLink(
    @Query("teamId") teamId: string,
  ): Promise<{ link: string }> {
    const link = await this.autoRespond.getCalendarLink(teamId);
    return { link };
  }

  /**
   * Health check endpoint
   * GET /ai-co-pilot/health
   */
  @Get("health")
  health(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
