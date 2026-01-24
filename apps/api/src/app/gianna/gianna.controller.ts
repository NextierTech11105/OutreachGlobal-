import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Logger,
} from "@nestjs/common";
import { GiannaService, GiannaContext, GiannaResponse } from "./gianna.service";

/**
 * GIANNA CONTROLLER
 *
 * REST API endpoints for the GIANNA SMS opener agent
 *
 * Endpoints:
 * - POST /api/gianna/opener - Generate opener message for cold outreach
 * - POST /api/gianna/respond - Process incoming response and generate reply
 * - POST /api/gianna/send - Send SMS via GIANNA
 * - GET /api/gianna/lead/:leadId - Get lead conversation context
 */

interface OpenerRequest {
  teamId: string;
  leadId: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  industry?: string;
  propertyAddress?: string;
  phone: string;
  category?: "property" | "business" | "general";
}

interface RespondRequest {
  teamId: string;
  leadId: string;
  incomingMessage: string;
  fromPhone: string;
  campaignId?: string;
}

interface SendSmsRequest {
  teamId: string;
  leadId: string;
  message: string;
  toPhone: string;
  fromPhone: string;
  campaignId?: string;
}

@Controller("gianna")
export class GiannaController {
  private readonly logger = new Logger(GiannaController.name);

  constructor(private readonly giannaService: GiannaService) {}

  /**
   * Generate an opener message for cold outreach
   */
  @Post("opener")
  async generateOpener(@Body() request: OpenerRequest): Promise<GiannaResponse> {
    this.logger.log(`[GIANNA] Generating opener for lead ${request.leadId}`);

    const context: GiannaContext = {
      teamId: request.teamId,
      leadId: request.leadId,
      firstName: request.firstName,
      lastName: request.lastName,
      companyName: request.companyName,
      industry: request.industry,
      propertyAddress: request.propertyAddress,
      phone: request.phone,
      messageNumber: 1, // First message
    };

    const response = await this.giannaService.generateOpener(
      context,
      request.category || "general",
    );

    this.logger.log(`[GIANNA] Generated opener: "${response.message}"`);
    return response;
  }

  /**
   * Process incoming response and generate reply
   */
  @Post("respond")
  async processResponse(@Body() request: RespondRequest): Promise<GiannaResponse> {
    this.logger.log(
      `[GIANNA] Processing response from ${request.fromPhone}: "${request.incomingMessage}"`,
    );

    // Get lead context
    const context = await this.giannaService.getLeadContext(
      request.teamId,
      request.leadId,
    );

    if (!context) {
      this.logger.warn(`[GIANNA] Lead not found: ${request.leadId}`);
      return {
        message: "",
        confidence: 0,
        requiresHumanReview: true,
        intent: "error_lead_not_found",
      };
    }

    // Add campaign context if provided
    if (request.campaignId) {
      context.campaignId = request.campaignId;
    }

    const response = await this.giannaService.processIncomingResponse(
      request.incomingMessage,
      context,
    );

    // Log the incoming message
    await this.giannaService.logMessage(
      request.teamId,
      request.leadId,
      request.incomingMessage,
      "inbound",
      request.fromPhone,
      "", // toAddress would be our number
      { source: "gianna_respond" },
    );

    this.logger.log(
      `[GIANNA] Response generated: intent=${response.intent}, confidence=${response.confidence}%, needsReview=${response.requiresHumanReview}`,
    );

    return response;
  }

  /**
   * Send SMS via GIANNA
   */
  @Post("send")
  async sendSms(@Body() request: SendSmsRequest): Promise<{ jobId: string; success: boolean }> {
    this.logger.log(`[GIANNA] Queueing SMS to ${request.toPhone}`);

    const result = await this.giannaService.sendSms(
      request.teamId,
      request.leadId,
      request.message,
      request.toPhone,
      request.fromPhone,
      request.campaignId,
    );

    // Log the outbound message
    await this.giannaService.logMessage(
      request.teamId,
      request.leadId,
      request.message,
      "outbound",
      request.fromPhone,
      request.toPhone,
      { source: "gianna_send", jobId: result.jobId },
    );

    return { ...result, success: true };
  }

  /**
   * Get lead conversation context
   */
  @Get("lead/:leadId")
  async getLeadContext(
    @Param("leadId") leadId: string,
    @Query("teamId") teamId: string,
  ): Promise<GiannaContext | { error: string }> {
    if (!teamId) {
      return { error: "teamId query parameter is required" };
    }

    const context = await this.giannaService.getLeadContext(teamId, leadId);

    if (!context) {
      return { error: "Lead not found" };
    }

    return context;
  }

  /**
   * Classify a message (utility endpoint)
   */
  @Post("classify")
  async classifyMessage(
    @Body() body: { message: string },
  ): Promise<ReturnType<GiannaService["classifyResponse"]>> {
    return this.giannaService.classifyResponse(body.message);
  }

  /**
   * Health check
   */
  @Get("health")
  async healthCheck(): Promise<{ status: string; agent: string; timestamp: string }> {
    return {
      status: "healthy",
      agent: "GIANNA",
      timestamp: new Date().toISOString(),
    };
  }
}
