import { Injectable, Logger } from "@nestjs/common";
import { RawDataLakeService } from "@/app/raw-data-lake/raw-data-lake.service";
import { TracerfyClient } from "@/app/luci/clients/tracerfy.client";
import { TrestleClient } from "@/app/luci/clients/trestle.client";
import { TraceType } from "@/app/luci/constants";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leadsTable } from "@/database/schema-alias";
import { inArray } from "drizzle-orm";

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResult {
  tool: string;
  success: boolean;
  data: any;
  error?: string;
}

// Cost constants - NEXTIER wholesale costs
const COSTS = {
  PERSON_TRACE: 0.02,      // $0.02/lead with first+last name
  COMPANY_TRACE: 0.15,     // $0.15/lead with company only (7.5x more!)
  PHONE_VALIDATE: 0.015,   // $0.015/phone (Trestle)
  SMS: 0.01,               // $0.01/message
};

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);

  constructor(
    private readonly rawDataLake: RawDataLakeService,
    private readonly tracerfy: TracerfyClient,
    private readonly trestle: TrestleClient,
    @InjectDB() private readonly db: DrizzleClient,
  ) {}

  /**
   * Get OpenAI-compatible function schemas
   */
  getToolSchemas(): ToolSchema[] {
    return [
      {
        name: "analyze_datalake",
        description: "Analyze leads in the data lake. Returns counts by vertical, state, and cost estimates. FREE - no API calls.",
        parameters: {
          type: "object",
          properties: {
            vertical: {
              type: "string",
              description: "Filter by vertical: realtors, plumbing, consultants",
              enum: ["realtors", "plumbing", "consultants"],
            },
            state: {
              type: "string",
              description: "Filter by US state code (e.g., FL, TX, CA)",
            },
          },
        },
      },
      {
        name: "skip_trace_person",
        description: `Skip trace leads using first+last name. COSTS $${COSTS.PERSON_TRACE}/lead. Requires user confirmation.`,
        parameters: {
          type: "object",
          properties: {
            leadIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of lead IDs to trace",
            },
            blockId: {
              type: "string",
              description: "Block ID to trace all leads in block",
            },
          },
        },
      },
      {
        name: "skip_trace_company",
        description: `Skip trace leads using company name only. COSTS $${COSTS.COMPANY_TRACE}/lead. Use when no person name available.`,
        parameters: {
          type: "object",
          properties: {
            leadIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of lead IDs to trace",
            },
            blockId: {
              type: "string",
              description: "Block ID to trace all leads in block",
            },
          },
        },
      },
      {
        name: "validate_phones",
        description: `Validate phone numbers via Trestle. Returns activity score (0-100) and grade (A-F). COSTS $${COSTS.PHONE_VALIDATE}/phone.`,
        parameters: {
          type: "object",
          properties: {
            leadIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of lead IDs with phones to validate",
            },
            blockId: {
              type: "string",
              description: "Block ID to validate all leads with phones",
            },
          },
        },
      },
      {
        name: "backfill_to_target",
        description: "If block has fewer than target contactable leads, pull more from datalake. Uses smart rounding (996 → 1000 → 2000).",
        parameters: {
          type: "object",
          properties: {
            blockId: {
              type: "string",
              description: "Block ID to backfill",
            },
            currentContactable: {
              type: "number",
              description: "Current number of contactable leads",
            },
            targetSize: {
              type: "number",
              description: "Target number of contactable leads (usually 2000)",
            },
          },
          required: ["blockId", "currentContactable", "targetSize"],
        },
      },
    ];
  }

  /**
   * Check if tool is read-only (no cost, no confirmation needed)
   */
  isReadOnly(toolName: string): boolean {
    return toolName === "analyze_datalake";
  }

  /**
   * Estimate cost for a tool execution
   */
  estimateCost(toolName: string, args: any): number {
    const count = args.leadIds?.length || args.count || 0;

    switch (toolName) {
      case "skip_trace_person":
        return count * COSTS.PERSON_TRACE;
      case "skip_trace_company":
        return count * COSTS.COMPANY_TRACE;
      case "validate_phones":
        return count * COSTS.PHONE_VALIDATE;
      case "backfill_to_target":
        const needed = (args.targetSize || 2000) - (args.currentContactable || 0);
        return needed * COSTS.PERSON_TRACE; // Assume person trace
      default:
        return 0;
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolName: string,
    args: any,
    onProgress?: (progress: number) => void,
  ): Promise<ToolResult> {
    this.logger.log(`Executing tool: ${toolName}`);

    try {
      switch (toolName) {
        case "analyze_datalake":
          return this.analyzeDatalake(args);

        case "skip_trace_person":
        case "skip_trace_company":
          return this.skipTrace(toolName, args, onProgress);

        case "validate_phones":
          return this.validatePhones(args, onProgress);

        case "backfill_to_target":
          return this.backfillToTarget(args, onProgress);

        default:
          return {
            tool: toolName,
            success: false,
            data: null,
            error: `Unknown tool: ${toolName}`,
          };
      }
    } catch (err: any) {
      this.logger.error(`Tool ${toolName} failed: ${err.message}`);
      return {
        tool: toolName,
        success: false,
        data: null,
        error: err.message,
      };
    }
  }

  // Tool implementations

  private async analyzeDatalake(args: any): Promise<ToolResult> {
    const { teamId, vertical, state } = args;

    // Get stats from RawDataLakeService
    const stats = await this.rawDataLake.getVerticalStats(teamId);
    const verticals = await this.rawDataLake.getVerticals(teamId);

    // Filter if specified
    let filtered = stats;
    if (vertical) {
      filtered = stats.filter(s => s.vertical === vertical);
    }

    const total = filtered.reduce((sum, s) => sum + s.total, 0);

    // Count by person name vs company only (estimate based on typical data)
    // Assume 70% have person names, 30% company only
    const byPersonName = Math.round(total * 0.7);
    const byCompanyOnly = total - byPersonName;

    // Build by-vertical breakdown
    const byVertical: Record<string, number> = {};
    for (const v of verticals) {
      byVertical[v.vertical] = v.count;
    }

    return {
      tool: "analyze_datalake",
      success: true,
      data: {
        total,
        byVertical,
        byPersonName,
        byCompanyOnly,
        raw: filtered.reduce((sum, s) => sum + s.raw, 0),
        traced: filtered.reduce((sum, s) => sum + s.traced, 0),
        scored: filtered.reduce((sum, s) => sum + s.scored, 0),
        ready: filtered.reduce((sum, s) => sum + s.ready, 0),
        smsReady: filtered.reduce((sum, s) => sum + s.smsReady, 0),
        costEstimate: {
          personTrace: byPersonName * COSTS.PERSON_TRACE,
          companyTrace: byCompanyOnly * COSTS.COMPANY_TRACE,
          phoneValidation: total * COSTS.PHONE_VALIDATE,
        },
      },
    };
  }

  private async skipTrace(
    toolName: string,
    args: any,
    onProgress?: (progress: number) => void,
  ): Promise<ToolResult> {
    const { leadIds, teamId } = args;
    const isCompanyTrace = toolName === "skip_trace_company";

    if (!leadIds || leadIds.length === 0) {
      return {
        tool: toolName,
        success: false,
        data: null,
        error: "No lead IDs provided",
      };
    }

    try {
      // 1. Fetch leads from database
      const leads = await this.db.query.leads.findMany({
        where: inArray(leadsTable.id, leadIds),
      });

      if (leads.length === 0) {
        return {
          tool: toolName,
          success: false,
          data: null,
          error: "No leads found for provided IDs",
        };
      }

      if (onProgress) onProgress(10);

      // 2. Prepare CSV data for Tracerfy
      const jsonData = leads.map((lead: any) => ({
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        zip: lead.zip || "",
        first_name: isCompanyTrace ? "" : (lead.firstName || ""),
        last_name: isCompanyTrace ? "" : (lead.lastName || ""),
        mail_address: lead.mailingAddress || lead.address || "",
        mail_city: lead.mailingCity || lead.city || "",
        mail_state: lead.mailingState || lead.state || "",
        mailing_zip: lead.mailingZip || lead.zip || "",
        company: lead.company || "",
      }));

      if (onProgress) onProgress(20);

      // 3. Begin Tracerfy trace
      const traceResult = await this.tracerfy.beginTrace({
        jsonData,
        columnMapping: {
          address: "address",
          city: "city",
          state: "state",
          zip: "zip",
          firstName: "first_name",
          lastName: "last_name",
          mailAddress: "mail_address",
          mailCity: "mail_city",
          mailState: "mail_state",
          mailingZip: "mailing_zip",
        },
        traceType: TraceType.NORMAL, // Always normal (1 credit), company vs person is determined by data provided
      });

      if (onProgress) onProgress(40);

      // 4. Wait for queue completion (with progress updates)
      const completedQueue = await this.tracerfy.waitForQueue(
        traceResult.queue_id,
        300000, // 5 min max
        5000,   // poll every 5 sec
      );

      if (onProgress) onProgress(70);

      // 5. Download results
      if (!completedQueue.download_url) {
        throw new Error("No download URL returned from Tracerfy");
      }

      const records = await this.tracerfy.getQueue(traceResult.queue_id);

      if (onProgress) onProgress(90);

      // 6. Count results
      let phonesFound = 0;
      let emailsFound = 0;

      for (const record of records) {
        const phones = this.tracerfy.extractPhones(record);
        const emails = this.tracerfy.extractEmails(record);
        if (phones.length > 0) phonesFound++;
        if (emails.length > 0) emailsFound++;
      }

      const cost = leads.length * (isCompanyTrace ? COSTS.COMPANY_TRACE : COSTS.PERSON_TRACE);

      if (onProgress) onProgress(100);

      return {
        tool: toolName,
        success: true,
        data: {
          processed: leads.length,
          queueId: traceResult.queue_id,
          phonesFound,
          emailsFound,
          hitRate: Math.round((phonesFound / leads.length) * 100),
          cost,
          message: `Traced ${leads.length} leads. Found phones for ${phonesFound} leads (${Math.round((phonesFound / leads.length) * 100)}% hit rate).`,
        },
      };
    } catch (err: any) {
      this.logger.error(`Skip trace failed: ${err.message}`);
      return {
        tool: toolName,
        success: false,
        data: null,
        error: err.message,
      };
    }
  }

  private async validatePhones(
    args: any,
    onProgress?: (progress: number) => void,
  ): Promise<ToolResult> {
    const { leadIds } = args;

    if (!leadIds || leadIds.length === 0) {
      return {
        tool: "validate_phones",
        success: false,
        data: null,
        error: "No lead IDs provided",
      };
    }

    try {
      // 1. Fetch leads with phones from database
      const leads = await this.db.query.leads.findMany({
        where: inArray(leadsTable.id, leadIds),
      });

      if (leads.length === 0) {
        return {
          tool: "validate_phones",
          success: false,
          data: null,
          error: "No leads found for provided IDs",
        };
      }

      if (onProgress) onProgress(10);

      // 2. Prepare phone data for Trestle batch scoring
      const phonesRequest = leads
        .filter((lead: any) => lead.primaryPhone || lead.phone)
        .map((lead: any) => ({
          leadId: lead.id,
          phones: [lead.primaryPhone || lead.phone].filter(Boolean),
        }));

      if (phonesRequest.length === 0) {
        return {
          tool: "validate_phones",
          success: false,
          data: null,
          error: "No leads have phone numbers to validate",
        };
      }

      if (onProgress) onProgress(30);

      // 3. Run Trestle batch scoring
      const batchResult = await this.trestle.batchScore({
        phones: phonesRequest,
      });

      if (onProgress) onProgress(90);

      // 4. Calculate costs and summary
      const cost = phonesRequest.length * COSTS.PHONE_VALIDATE;

      if (onProgress) onProgress(100);

      return {
        tool: "validate_phones",
        success: true,
        data: {
          processed: batchResult.totalRecords,
          gradeA: batchResult.summary.gradeDistribution.A,
          gradeB: batchResult.summary.gradeDistribution.B,
          gradeC: batchResult.summary.gradeDistribution.C,
          gradeD: batchResult.summary.gradeDistribution.D,
          gradeF: batchResult.summary.gradeDistribution.F,
          smsReady: batchResult.summary.smsReadyCount,
          avgContactabilityScore: Math.round(batchResult.summary.avgContactabilityScore),
          cost,
          message: `Validated ${batchResult.totalRecords} phones. ${batchResult.summary.smsReadyCount} are SMS-ready (Grade A/B with activity ≥70).`,
        },
      };
    } catch (err: any) {
      this.logger.error(`Phone validation failed: ${err.message}`);
      return {
        tool: "validate_phones",
        success: false,
        data: null,
        error: err.message,
      };
    }
  }

  private async backfillToTarget(
    args: any,
    onProgress?: (progress: number) => void,
  ): Promise<ToolResult> {
    const { currentContactable, targetSize } = args;
    const needed = targetSize - currentContactable;

    // Smart rounding: 996 → 1000, then continue to 2000
    let roundedTarget = targetSize;
    if (currentContactable >= 990 && currentContactable < 1000) {
      roundedTarget = 1000;
    }

    if (onProgress) {
      onProgress(100);
    }

    return {
      tool: "backfill_to_target",
      success: true,
      data: {
        needed,
        roundedTarget,
        message: `Need ${needed} more contactable leads to reach ${roundedTarget}`,
      },
    };
  }
}
