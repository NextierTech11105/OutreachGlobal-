import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { TenantContext } from "@/app/auth/decorators";
import { CombinedAuthGuard } from "@/app/auth/guards/combined-auth.guard";
import { RawDataLakeService } from "./raw-data-lake.service";

/**
 * Raw Data Lake Controller
 *
 * Handles CSV imports and raw list management.
 *
 * IMPORTANT BUSINESS RULES:
 * - Imported records are LIST ITEMS, not leads
 * - A record becomes a LEAD only after Tracerfy finds a phone
 * - No phone = No Lead ID = Not SMS ready
 * - Trestle scoring is for quality grading, not lead creation
 */
@Controller("raw-data-lake")
@UseGuards(CombinedAuthGuard)
export class RawDataLakeController {
  private readonly logger = new Logger(RawDataLakeController.name);

  constructor(private readonly service: RawDataLakeService) {}

  /**
   * Import CSV content (as string/base64)
   * Creates LIST ITEMS (not leads yet - no leadId until Tracerfy)
   */
  @Post("import")
  async importCSV(
    @TenantContext("teamId") teamId: string,
    @Body()
    body: {
      csvContent: string; // CSV content as string
      vertical?: string; // plumbing, consultants, realtors
      sourceTag?: string;
      fileName?: string;
    }
  ) {
    if (!body.csvContent) {
      throw new BadRequestException("csvContent is required");
    }

    this.logger.log(`Importing CSV for team ${teamId}, vertical: ${body.vertical || "auto-detect"}`);

    const stats = await this.service.importCSV(teamId, body.csvContent, {
      vertical: body.vertical,
      sourceTag: body.sourceTag || "csv_import",
      fileName: body.fileName,
    });

    return {
      success: true,
      message: `Imported ${stats.imported} list items (NOT leads yet - need Tracerfy for phone/leadId)`,
      stats,
      nextSteps: [
        "POST /raw-data-lake/create-block to group items into a block",
        "POST /luci/enrich-block/:blockId to run Tracerfy → creates actual LEADS with leadId",
      ],
    };
  }

  /**
   * Get vertical stats (how many raw items by industry)
   */
  @Get("verticals")
  async getVerticals(@TenantContext("teamId") teamId: string) {
    const verticals = await this.service.getVerticals(teamId);

    return {
      success: true,
      verticals,
      note: "These are LIST ITEMS, not leads. Run Tracerfy to create leads with phones.",
    };
  }

  /**
   * Get detailed stats by vertical
   */
  @Get("stats")
  async getStats(@TenantContext("teamId") teamId: string) {
    const stats = await this.service.getVerticalStats(teamId);

    return {
      success: true,
      stats,
      legend: {
        raw: "List items - no phone yet",
        traced: "Tracerfy ran - has phone = now a LEAD",
        scored: "Trestle graded - quality known",
        ready: "SMS ready - can campaign",
        smsReady: "Has valid mobile + good grade",
      },
    };
  }

  /**
   * Browse list items (window shopping)
   * Phone/email hidden until traced
   */
  @Get("browse")
  async browseLeads(
    @TenantContext("teamId") teamId: string,
    @Query("vertical") vertical?: string,
    @Query("state") state?: string,
    @Query("city") city?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string
  ) {
    const result = await this.service.browseLeads(teamId, {
      vertical,
      state,
      city,
      status,
      page: page ? parseInt(page) : 1,
      perPage: perPage ? parseInt(perPage) : 100,
    });

    return {
      success: true,
      ...result,
      note: "Phone/email hidden for raw items. Run Tracerfy to reveal and create leads.",
    };
  }

  /**
   * Create a block from list items
   * Block = batch ready for Tracerfy enrichment
   */
  @Post("create-block")
  async createBlock(
    @TenantContext("teamId") teamId: string,
    @Body()
    body: {
      vertical?: string;
      state?: string;
      city?: string;
      leadIds?: string[];
      blockSize: 500 | 1000 | 2000;
    }
  ) {
    if (!body.blockSize || ![500, 1000, 2000].includes(body.blockSize)) {
      throw new BadRequestException("blockSize must be 500, 1000, or 2000");
    }

    const result = await this.service.createBlock(teamId, body);

    return {
      success: true,
      blockId: result.blockId,
      count: result.count,
      estimatedCost: result.estimatedCost,
      message: `Created block with ${result.count} list items`,
      nextStep: `POST /luci/enrich-block/${result.blockId} to run Tracerfy and create LEADS`,
      costBreakdown: {
        tracerfy: `$${(result.count * 0.02).toFixed(2)} (skip trace)`,
        trestle: `$${(result.count * 0.03).toFixed(2)} (phone scoring - optional)`,
        total: `$${result.estimatedCost.toFixed(2)}`,
      },
    };
  }

  /**
   * Health check
   */
  @Get("health")
  health() {
    return {
      status: "ok",
      service: "raw-data-lake",
      description: "CSV import and list management for LUCI enrichment pipeline",
      flow: [
        "1. Import CSV → Creates LIST ITEMS (no leadId)",
        "2. Create Block → Groups items for enrichment",
        "3. Tracerfy → Finds phones → Creates LEADS with leadId",
        "4. Trestle → Grades leads → Sets smsReady flag",
        "5. Campaign → GIANNA sends SMS to smsReady leads",
      ],
    };
  }
}
