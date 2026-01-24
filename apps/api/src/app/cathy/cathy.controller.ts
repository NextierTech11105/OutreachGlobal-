import { Controller, Post, Get, Body, Query, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from "@nestjs/swagger";
import { CathyService, CathyResponse } from "./cathy.service";

/**
 * CATHY CONTROLLER
 *
 * REST API endpoints for the CATHY nurture agent
 *
 * Endpoints:
 * - POST /api/cathy/generate - Generate a nurture message for a lead
 * - POST /api/cathy/process-response - Process an incoming response
 * - GET /api/cathy/leads-to-nurture - Get leads that need nurturing
 */

interface GenerateRequest {
  teamId: string;
  leadId: string;
}

interface ProcessResponseRequest {
  teamId: string;
  leadId: string;
  message: string;
}

@ApiTags("Cathy - Nurture Agent")
@Controller("cathy")
export class CathyController {
  private readonly logger = new Logger(CathyController.name);

  constructor(private readonly cathyService: CathyService) {}

  @Post("generate")
  @ApiOperation({ summary: "Generate a nurture message for a lead" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        teamId: { type: "string" },
        leadId: { type: "string" },
      },
      required: ["teamId", "leadId"],
    },
  })
  async generateMessage(@Body() body: GenerateRequest): Promise<CathyResponse> {
    this.logger.log(`[CATHY] Generating nurture message for lead ${body.leadId}`);
    return this.cathyService.generateNurtureMessage(body.teamId, body.leadId);
  }

  @Post("process-response")
  @ApiOperation({ summary: "Process an incoming response from a nurtured lead" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        teamId: { type: "string" },
        leadId: { type: "string" },
        message: { type: "string" },
      },
      required: ["teamId", "leadId", "message"],
    },
  })
  async processResponse(@Body() body: ProcessResponseRequest) {
    this.logger.log(`[CATHY] Processing response from lead ${body.leadId}`);
    return this.cathyService.processResponse(body.teamId, body.leadId, body.message);
  }

  @Get("leads-to-nurture")
  @ApiOperation({ summary: "Get leads that need nurturing today" })
  @ApiQuery({ name: "teamId", required: true, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getLeadsToNurture(
    @Query("teamId") teamId: string,
    @Query("limit") limit?: number,
  ) {
    return this.cathyService.getLeadsToNurture(teamId, limit ? parseInt(String(limit)) : 50);
  }

  /**
   * Health check
   */
  @Get("health")
  async healthCheck(): Promise<{
    status: string;
    agent: string;
    timestamp: string;
  }> {
    return {
      status: "healthy",
      agent: "CATHY",
      timestamp: new Date().toISOString(),
    };
  }
}
