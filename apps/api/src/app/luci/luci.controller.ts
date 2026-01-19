/**
 * LUCI Engine Controller
 * REST endpoints for data pipeline operations
 *
 * ARCHITECTURE:
 * - Data Lake: Unlimited imports (338k plumbers, 500k realtors, etc.)
 * - Enrichment Blocks: 10k capacity, on-demand processing
 * - Sub-blocks: 500/1k/2k per day - pay only what you use
 *
 * "LUCI, process [filename] for [sector]"
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
// FileInterceptor would need @nestjs/platform-express - using manual parsing instead
import { LuciService, PipelineConfig } from "./luci.service";
import { TracerfyClient } from "./clients/tracerfy.client";
import { TrestleClient } from "./clients/trestle.client";
import { CampaignExecutorService } from "./services/campaign-executor.service";
import { TenantContext, CorrelationId } from "@/app/auth/decorators";
import { CombinedAuthGuard } from "@/app/auth/guards/combined-auth.guard";
import { TraceType } from "./constants";

interface StartPipelineDto {
  sectorTag: string;
  sicCode?: string;
  dailyTarget?: 500 | 1000 | 2000;
  traceType?: "normal" | "enhanced";
}

// USBizData default column mapping
const USBIZDATA_COLUMNS = {
  address: "Address",
  city: "City",
  state: "State",
  zip: "Zip",
  firstName: "Contact First",
  lastName: "Contact Last",
  mailAddress: "Address",
  mailCity: "City",
  mailState: "State",
  mailingZip: "Zip",
};

@Controller("luci")
@UseGuards(CombinedAuthGuard)
export class LuciController {
  private readonly logger = new Logger(LuciController.name);

  constructor(
    private luciService: LuciService,
    private tracerfy: TracerfyClient,
    private trestle: TrestleClient,
    private campaignExecutor: CampaignExecutorService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LAKE - UNLIMITED IMPORTS
  // Import 338k plumbers, 500k realtors - no enrichment cost yet
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Import CSV to Data Lake
   * Unlimited capacity - import all 338,605 plumbers at once
   * No Tracerfy/Trestle cost until you pull to enrichment block
   */
  @Post("lake/import")
  async importToLake(
    @Body()
    body: {
      filePath?: string; // Path from DO Spaces
      csvData?: string; // Direct CSV string
      sectorTag: string;
      sicCode?: string;
    },
    @TenantContext("teamId") teamId: string,
  ) {
    this.logger.log(
      `[LUCI] Data Lake import for team ${teamId}, sector: ${body.sectorTag}`,
    );

    try {
      let csvData: string;
      let fileName: string;

      if (body.csvData) {
        csvData = body.csvData;
        fileName = "direct-upload.csv";
      } else if (body.filePath) {
        const spacesUrl =
          process.env.DO_SPACES_URL ||
          "https://nextier-data.nyc3.digitaloceanspaces.com";
        const res = await fetch(`${spacesUrl}/${body.filePath}`);
        if (!res.ok) throw new Error(`File fetch failed: ${res.status}`);
        csvData = await res.text();
        fileName = body.filePath.split("/").pop() || "imported.csv";
      } else {
        throw new Error("Provide csvData or filePath");
      }

      const result = await this.luciService.importToLake(
        teamId,
        csvData,
        fileName,
        body.sectorTag,
        body.sicCode,
      );

      return {
        success: true,
        data: {
          lakeId: result.lakeId,
          imported: result.imported,
          failed: result.failed,
          rawCount: result.rawCount,
          dedup: {
            total: result.duplicates,
            inFile: result.duplicatesInFile,
            inDb: result.duplicatesInDb,
          },
          message: `Imported ${result.imported.toLocaleString()} leads | ${result.duplicates.toLocaleString()} duplicates removed`,
          nextStep: "Pull to enrichment block with POST /luci/block/pull",
        },
      };
    } catch (error) {
      this.logger.error(`Lake import failed: ${error}`);
      throw new HttpException(
        { success: false, error: error instanceof Error ? error.message : "Import failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get Data Lake stats
   */
  @Get("lake/stats")
  async getLakeStats(@TenantContext("teamId") teamId: string) {
    try {
      const stats = await this.luciService.getLakeStats(teamId);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get lake stats" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENRICHMENT BLOCKS - ON-DEMAND PROCESSING
  // Pull from lake, pay per trace (500/1k/2k per day)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pull leads from Data Lake to enrichment block
   * On-demand - only enrich what you need for today's campaign
   */
  @Post("block/pull")
  async pullFromLake(
    @Body()
    body: {
      dailyTarget: 500 | 1000 | 2000;
      sectorTag?: string;
    },
    @TenantContext("teamId") teamId: string,
  ) {
    this.logger.log(
      `[LUCI] Pulling ${body.dailyTarget} leads from lake for enrichment`,
    );

    try {
      const result = await this.luciService.pullFromLakeToBlock(
        teamId,
        body.dailyTarget,
        body.sectorTag,
      );

      return {
        success: true,
        data: {
          blockId: result.blockId,
          pulled: result.pulled,
          readyForTrace: result.readyForTrace,
          message: `Pulled ${result.pulled} leads for enrichment`,
          nextStep: "Run Tracerfy with POST /luci/enrich/trace",
        },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error instanceof Error ? error.message : "Pull failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get current block status
   */
  @Get("block/status")
  async getBlockStatus(@TenantContext("teamId") teamId: string) {
    try {
      const status = await this.luciService.getBlockStatus(teamId);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get block status" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENRICHMENT FLOW - Tracerfy ($0.02) → Trestle ($0.03) = $0.05/lead
  // Pay only for what you enrich
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run enrichment on pulled leads
   * Step 1: Tracerfy skip trace (phones/emails) - $0.02/lead
   * Step 2: Trestle Real Contact scoring - $0.03/lead
   * Output: ML-ready standardized scores
   */
  @Post("enrich/run")
  async runEnrichment(
    @Body()
    body: {
      sectorTag?: string;
      limit?: number; // How many to enrich (default: block's ready count)
    },
    @TenantContext("teamId") teamId: string,
  ) {
    this.logger.log(`[LUCI] Running enrichment pipeline for team ${teamId}`);

    try {
      // Get leads that need enrichment (status = traced, meaning pulled from lake)
      const blockStatus = await this.luciService.getBlockStatus(teamId);

      if (!blockStatus.activeBlock) {
        throw new Error("No active block. Pull leads from lake first with POST /luci/block/pull");
      }

      // This triggers the BullMQ job for async processing
      const batch = await this.luciService.startPipeline(
        teamId,
        Buffer.from(""), // Empty - will use DB leads
        USBIZDATA_COLUMNS,
        {
          dailyTarget: (body.limit || 2000) as 500 | 1000 | 2000,
          traceType: TraceType.NORMAL,
          campaignGoal: 20000,
          minGrade: "B",
          autoStart: true,
        },
      );

      return {
        success: true,
        data: {
          batchId: batch.id,
          status: batch.status,
          message: "Enrichment pipeline started",
          costs: {
            tracerfy: "$0.02/lead",
            trestle: "$0.03/lead",
            total: "$0.05/lead",
            estimated: `$${((body.limit || blockStatus.activeBlock.raw) * 0.05).toFixed(2)}`,
          },
          nextStep: "Check status with GET /luci/pipeline/batch/" + batch.id,
        },
      };
    } catch (error) {
      this.logger.error(`Enrichment failed: ${error}`);
      throw new HttpException(
        { success: false, error: error instanceof Error ? error.message : "Enrichment failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Score a batch of phones directly with Trestle
   * For testing or re-scoring
   */
  @Post("enrich/score")
  async scoreLeads(
    @Body()
    body: {
      leadIds?: string[];
      sectorTag?: string;
      limit?: number;
    },
    @TenantContext("teamId") teamId: string,
  ) {
    this.logger.log(`[LUCI] Scoring leads with Trestle for team ${teamId}`);

    try {
      // Get traced leads that need scoring
      const leads = await this.luciService.getLeadLabLeads(teamId, {
        status: "scored",
        limit: body.limit || 100,
      });

      if (leads.leads.length === 0) {
        return {
          success: true,
          data: {
            scored: 0,
            message: "No leads to score",
          },
        };
      }

      // Format for Trestle batch scoring
      const phonesToScore = leads.leads
        .filter((l) => l.phone)
        .map((l) => ({
          leadId: l.id,
          phones: [l.phone as string],
        }));

      const result = await this.trestle.batchScore({ phones: phonesToScore });

      return {
        success: true,
        data: {
          scored: result.totalRecords,
          smsReady: result.summary.smsReadyCount,
          results: result.results.slice(0, 10), // First 10 for preview
          cost: `$${(result.totalRecords * 0.03).toFixed(2)}`,
        },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Scoring failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE ENDPOINTS - Full flow (legacy)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start pipeline with CSV data (bypasses lake)
   * Use for small batches or testing
   */
  @Post("pipeline/start")
  async startPipeline(
    @Body() body: StartPipelineDto & { csvData?: string },
    @TenantContext("teamId") teamId: string,
  ) {
    this.logger.log(
      `[LUCI] Starting pipeline for team ${teamId}, sector: ${body.sectorTag}`,
    );

    try {
      const config: Partial<PipelineConfig> = {
        dailyTarget: body.dailyTarget || 2000,
        traceType: body.traceType || TraceType.NORMAL,
      };

      const batch = await this.luciService.startPipeline(
        teamId,
        Buffer.from(body.csvData || ""),
        USBIZDATA_COLUMNS,
        config,
      );

      return {
        success: true,
        data: {
          batchId: batch.id,
          status: batch.status,
          message: `Pipeline started`,
          sectorTag: body.sectorTag,
        },
      };
    } catch (error) {
      this.logger.error(`Pipeline start failed: ${error}`);
      throw new HttpException(
        { success: false, error: error instanceof Error ? error.message : "Pipeline start failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get batch status
   */
  @Get("pipeline/batch/:batchId")
  async getBatchStatus(
    @Param("batchId") batchId: string,
    @TenantContext("teamId") teamId: string,
  ) {
    const status = await this.luciService.getBatchStatus(batchId);

    if (!status || status.teamId !== teamId) {
      throw new HttpException(
        { success: false, error: "Batch not found" },
        HttpStatus.NOT_FOUND,
      );
    }

    return { success: true, data: status };
  }

  /**
   * Get campaign progress toward 20k goal
   */
  @Get("progress")
  async getProgress(@TenantContext("teamId") teamId: string) {
    try {
      const progress = await this.luciService.getCampaignProgress(teamId);
      return { success: true, data: progress };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get progress" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACERFY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get("tracerfy/analytics")
  async getTracerfyAnalytics() {
    try {
      const analytics = await this.luciService.getTracerfyAnalytics();
      return { success: true, data: analytics };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get Tracerfy analytics" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("tracerfy/queues")
  async getTracerfyQueues() {
    try {
      const queues = await this.tracerfy.getQueues();
      return { success: true, data: queues };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get queues" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("tracerfy/queue/:queueId")
  async getTracerfyQueue(@Param("queueId") queueId: string) {
    try {
      const records = await this.tracerfy.getQueue(parseInt(queueId, 10));
      return {
        success: true,
        data: { queueId: parseInt(queueId, 10), recordCount: records.length, records },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get queue" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORING ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  @Post("score/phone")
  async scorePhone(@Body() body: { phone: string }) {
    try {
      const result = await this.trestle.scorePhone(body.phone);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to score phone" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("score/batch")
  async scoreBatch(
    @Body() body: { phones: Array<{ leadId: string; phones: string[] }> },
  ) {
    try {
      const result = await this.trestle.batchScore(body);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to batch score" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUALIFICATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run qualification on scored leads
   * Ready: Grade A/B, Activity >= 70
   * Reject: Grade D/F, Activity < 50
   */
  @Post("qualify")
  async qualifyLeads(@TenantContext("teamId") teamId: string) {
    try {
      const result = await this.luciService.qualifyLeads(teamId);
      return {
        success: true,
        data: {
          ready: result.ready,
          rejected: result.rejected,
          message: `${result.ready} leads ready for campaign, ${result.rejected} rejected`,
        },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Qualification failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTOR CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  @Get("sectors")
  getSectors() {
    return {
      success: true,
      data: {
        sectors: [
          { sicCode: "1711", tag: "plumbing-hvac", name: "Plumbing, Heating & AC", records: 338605 },
          { sicCode: "8742", tag: "business-management-consulting", name: "Business Consulting", records: 250000 },
          { sicCode: "8748", tag: "business-consulting-nec", name: "Business Consulting NEC", records: 0 },
          { sicCode: "6531", tag: "realtors", name: "Real Estate Agents", records: 500000 },
        ],
        leadIdFormat: "NXT-{sic_code}-{uuid6}",
        example: "NXT-1711-a3f9b2",
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA MAP VISUALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  @Get("datamap")
  async getDataMap(@TenantContext("teamId") teamId: string) {
    try {
      const [lakeStats, blockStatus, progress] = await Promise.all([
        this.luciService.getLakeStats(teamId),
        this.luciService.getBlockStatus(teamId),
        this.luciService.getCampaignProgress(teamId),
      ]);

      return {
        success: true,
        data: {
          lake: {
            totalRecords: lakeStats.totalRecords,
            rawCount: lakeStats.rawCount,
            enrichedCount: lakeStats.enrichedCount,
            bySector: lakeStats.bySector,
          },
          block: blockStatus.activeBlock,
          pipeline: {
            stages: [
              { name: "LAKE", desc: "Raw Imports", count: lakeStats.rawCount, status: "active" },
              { name: "TRACED", desc: "Tracerfy", count: blockStatus.activeBlock?.traced || 0, status: "active" },
              { name: "SCORED", desc: "Trestle", count: blockStatus.activeBlock?.scored || 0, status: "active" },
              { name: "READY", desc: "Campaign Ready", count: blockStatus.activeBlock?.ready || 0, status: "active" },
            ],
            flow: "LAKE → TRACED → SCORED → READY → CAMPAIGN",
          },
          campaign: {
            goal: progress.goal,
            current: progress.current,
            remaining: progress.remaining,
            percentComplete: progress.percentComplete,
            daysRemaining: progress.daysRemaining,
            smsReadyCount: progress.smsReadyCount,
          },
          gradeDistribution: progress.gradeDistribution,
        },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get data map" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAD LAB - MANUAL REVIEW & CAMPAIGN PUSH
  // ═══════════════════════════════════════════════════════════════════════════

  @Get("leadlab")
  async getLeadLab(
    @TenantContext("teamId") teamId: string,
    @Query("status") status?: "scored" | "ready" | "campaign",
    @Query("minGrade") minGrade?: "A" | "B" | "C",
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    try {
      const result = await this.luciService.getLeadLabLeads(teamId, {
        status,
        minGrade,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get Lead Lab data" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("leadlab/push")
  async pushToCampaign(
    @Body() body: { leadIds: string[]; campaignId: string },
    @TenantContext("teamId") teamId: string,
  ) {
    if (!body.leadIds?.length) {
      throw new HttpException({ success: false, error: "No leads selected" }, HttpStatus.BAD_REQUEST);
    }
    if (!body.campaignId) {
      throw new HttpException({ success: false, error: "Campaign ID required" }, HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.luciService.pushToCampaign(teamId, body.leadIds, body.campaignId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to push leads to campaign" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGN EXECUTION - SignalHouse Bulk SMS
  // Deal Types: AI Consulting, Platform White Label, Business Exits, Capital Connect
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute SMS campaign - mobiles first, best scores first
   * Campaign: CJRCU60 (NEXTIER)
   * Daily Cap: 2k (T-Mobile)
   */
  @Post("campaign/execute")
  async executeCampaign(
    @Body()
    body: {
      message: string; // Template with {firstName}, {company} placeholders
      dealType?: "ai-consulting" | "platform-white-label" | "business-exits" | "capital-connect" | "dataverse" | "terminals" | "blueprints" | "system-mapping";
      sectorTag?: string;
      limit?: number; // Default 500, max 2000
      dryRun?: boolean;
    },
    @TenantContext("teamId") teamId: string,
  ) {
    if (!body.message) {
      throw new HttpException({ success: false, error: "Message template required" }, HttpStatus.BAD_REQUEST);
    }

    this.logger.log(
      `[LUCI] Executing campaign: dealType=${body.dealType || "default"}, limit=${body.limit || 500}`,
    );

    try {
      const result = await this.campaignExecutor.executeCampaign({
        teamId,
        messageTemplate: body.message,
        sectorTag: body.sectorTag,
        limit: Math.min(body.limit || 500, 2000),
        dryRun: body.dryRun,
      });

      return {
        success: true,
        data: {
          ...result,
          dealType: body.dealType || "default",
          campaignId: "CJRCU60",
          message: body.dryRun
            ? `[DRY RUN] Would send ${result.sent} SMS`
            : `Sent ${result.sent} SMS via SignalHouse`,
        },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error instanceof Error ? error.message : "Campaign execution failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get campaign stats and remaining daily capacity
   */
  @Get("campaign/stats")
  async getCampaignStats(@TenantContext("teamId") teamId: string) {
    try {
      const stats = await this.campaignExecutor.getCampaignStats(teamId);
      return {
        success: true,
        data: {
          ...stats,
          campaignId: "CJRCU60",
          dailyCap: 2000,
          fromNumber: "15164079249",
        },
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get campaign stats" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get deal type message templates
   * CLEARED FOR PRODUCTION DATA - Configure via admin panel
   *
   * Available Variables:
   * - {firstName} - Lead's first name
   * - {lastName} - Lead's last name
   * - {company} - Company name
   */
  @Get("campaign/templates")
  getDealTypeTemplates() {
    return {
      success: true,
      data: {
        // DEAL TYPES - Add templates via admin panel
        // Structure:
        // {
        //   type: string,        // "ai-consulting", "business-exits", etc.
        //   name: string,        // Display name
        //   template: string,    // Message with {variables}
        //   tonality: string,    // professional, business, confidential, etc.
        //   temperature: string  // warm, direct, consultative, etc.
        // }
        dealTypes: [],
        variables: ["firstName", "lastName", "company"],
        compliance: "Reply STOP to opt out.",
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENRICHMENT JOBS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get("jobs")
  async getEnrichmentJobs(@TenantContext("teamId") teamId: string) {
    try {
      const result = await this.luciService.getEnrichmentJobs(teamId);
      return { success: true, data: result };
    } catch (error) {
      throw new HttpException(
        { success: false, error: "Failed to get jobs" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACERFY WEBHOOK - Async results delivery
  // Configure in Tracerfy: Account → webhook_url = https://your-domain/api/luci/webhook/tracerfy
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Tracerfy Webhook - Receives completed trace results
   * No auth guard - Tracerfy calls this directly
   */
  @Post("webhook/tracerfy")
  async handleTracerfyWebhook(
    @Body() payload: {
      id: number;
      created_at: string;
      pending: boolean;
      download_url: string;
      rows_uploaded: number;
      credit_deducted: number;
      queue_type: "api" | "app";
      trace_type: "normal" | "enhanced";
      credits_per_lead: number;
    },
  ) {
    this.logger.log(`[LUCI] Tracerfy webhook received: queue ${payload.id}, ${payload.rows_uploaded} rows`);

    if (payload.pending) {
      this.logger.log(`[LUCI] Queue ${payload.id} still pending, ignoring`);
      return { success: true, message: "Queue still pending" };
    }

    try {
      // Download the results CSV
      const results = await this.tracerfy.downloadResults(payload.download_url);

      // Process the traced results - update leads in DB
      const processed = await this.luciService.processTracerfyResults(
        payload.id,
        results,
        payload.trace_type,
      );

      this.logger.log(
        `[LUCI] Tracerfy webhook processed: ${processed.updated} leads updated, ${processed.phones} phones found`,
      );

      return {
        success: true,
        data: {
          queueId: payload.id,
          rowsUploaded: payload.rows_uploaded,
          leadsUpdated: processed.updated,
          phonesFound: processed.phones,
          emailsFound: processed.emails,
          readyForScoring: processed.updated,
        },
      };
    } catch (error) {
      this.logger.error(`[LUCI] Tracerfy webhook failed: ${error}`);
      throw new HttpException(
        { success: false, error: "Webhook processing failed" },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
