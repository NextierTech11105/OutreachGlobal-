import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Logger,
} from "@nestjs/common";
import {
  NevaService,
  NevaEnrichRequest,
  NevaContextPacket,
  NevaDiscoveryPrep,
} from "./neva.service";

/**
 * NEVA CONTROLLER - Research Copilot API
 *
 * REST API endpoints for NEVA research capabilities:
 * - POST /api/neva/enrich - Research a business and get context
 * - GET /api/neva/context/:leadId - Get cached context for a lead
 * - POST /api/neva/discovery - Prepare discovery call questions
 * - POST /api/neva/evaluate - Evaluate confidence of research
 */

interface EnrichRequestDto {
  teamId: string;
  leadId: string;
  business: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    industry?: string;
  };
  owner?: {
    name?: string;
    email?: string;
  };
  campaignType?: "cold_outreach" | "nurture" | "reactivation";
  intent?: string;
  priorInteractions?: number;
  skipCache?: boolean;
}

interface DiscoveryRequestDto {
  leadId: string;
  teamId: string;
}

@Controller("neva")
export class NevaController {
  private readonly logger = new Logger(NevaController.name);

  constructor(private readonly nevaService: NevaService) {}

  /**
   * POST /api/neva/enrich
   * Research a business and get enriched context
   */
  @Post("enrich")
  async enrich(@Body() body: EnrichRequestDto): Promise<{
    success: boolean;
    packet?: NevaContextPacket;
    error?: string;
  }> {
    this.logger.log(`[NEVA] Enrichment request for: ${body.business.name}`);

    const request: NevaEnrichRequest = {
      leadId: body.leadId,
      teamId: body.teamId,
      business: body.business,
      owner: body.owner,
      context: {
        campaignType: body.campaignType || "cold_outreach",
        intent: body.intent || "initial_outreach",
        priorInteractions: body.priorInteractions,
      },
      options: {
        skipCache: body.skipCache,
      },
    };

    const packet = await this.nevaService.enrich(request);

    if (!packet) {
      return {
        success: false,
        error: "Research failed or returned empty",
      };
    }

    return {
      success: true,
      packet,
    };
  }

  /**
   * GET /api/neva/context/:leadId
   * Get cached research context for a lead
   */
  @Get("context/:leadId")
  async getContext(
    @Param("leadId") leadId: string,
    @Query("teamId") teamId: string,
  ): Promise<{
    success: boolean;
    packet?: NevaContextPacket;
    cached: boolean;
    error?: string;
  }> {
    if (!teamId) {
      return {
        success: false,
        cached: false,
        error: "teamId query parameter is required",
      };
    }

    const packet = await this.nevaService.getContext(leadId, teamId);

    if (!packet) {
      return {
        success: false,
        cached: false,
        error: "No cached context found for this lead",
      };
    }

    return {
      success: true,
      packet,
      cached: true,
    };
  }

  /**
   * POST /api/neva/discovery
   * Prepare discovery call questions based on research
   */
  @Post("discovery")
  async prepareDiscovery(@Body() body: DiscoveryRequestDto): Promise<{
    success: boolean;
    prep?: NevaDiscoveryPrep;
    error?: string;
  }> {
    this.logger.log(`[NEVA] Discovery prep for lead: ${body.leadId}`);

    // Get cached context first
    const packet = await this.nevaService.getContext(body.leadId, body.teamId);

    if (!packet) {
      return {
        success: false,
        error: "No research context found. Call /enrich first.",
      };
    }

    const prep = await this.nevaService.prepareDiscovery(packet);

    return {
      success: true,
      prep,
    };
  }

  /**
   * POST /api/neva/evaluate
   * Evaluate confidence of existing research
   */
  @Post("evaluate")
  async evaluateConfidence(@Body() body: DiscoveryRequestDto): Promise<{
    success: boolean;
    evaluation?: {
      level: "HIGH" | "MEDIUM" | "LOW" | "NONE";
      score: number;
      usePersonalization: boolean;
      requiresReview: boolean;
      hasRiskFlags: boolean;
    };
    error?: string;
  }> {
    const packet = await this.nevaService.getContext(body.leadId, body.teamId);

    if (!packet) {
      return {
        success: false,
        error: "No research context found. Call /enrich first.",
      };
    }

    const confidence = this.nevaService.evaluateConfidence(packet);
    const hasRiskFlags = this.nevaService.hasRiskFlags(packet);

    return {
      success: true,
      evaluation: {
        ...confidence,
        hasRiskFlags,
      },
    };
  }

  /**
   * GET /api/neva/health
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
      agent: "NEVA",
      timestamp: new Date().toISOString(),
    };
  }
}
