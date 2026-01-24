import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from "@nestjs/swagger";
import { DemoService, DemoLead, SmsPreview, SmsBatchResult, ConversationResult } from "./demo.service";
import { TemplateService, TemplateCreate } from "./template.service";

/**
 * DEMO CONTROLLER - Full Demo-Ready SMS Platform
 *
 * Endpoints:
 * - POST /api/demo/leads/generate - Generate demo leads
 * - POST /api/demo/leads/import-csv - Import leads from CSV
 * - POST /api/demo/leads/import-json - Import leads from JSON
 * - POST /api/demo/leads/save - Save leads to database
 *
 * - GET  /api/demo/templates - Get available templates
 * - POST /api/demo/sms/preview - Preview SMS before sending
 * - POST /api/demo/sms/execute - Execute SMS batch (10-2000)
 *
 * - POST /api/demo/conversation/simulate - Simulate conversation
 * - POST /api/demo/conversation/respond - Process inbound and auto-respond
 */

@ApiTags("Demo - SMS Platform")
@Controller("demo")
export class DemoController {
  private readonly logger = new Logger(DemoController.name);

  constructor(
    private readonly demoService: DemoService,
    private readonly templateService: TemplateService,
  ) {}

  // ===========================================================================
  // LEAD GENERATION & IMPORT
  // ===========================================================================

  @Post("leads/generate")
  @ApiOperation({ summary: "Generate simulated leads for demo" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        count: { type: "number", minimum: 1, maximum: 2000 },
        industry: { type: "string" },
        state: { type: "string" },
        includeProperty: { type: "boolean" },
      },
      required: ["count"],
    },
  })
  async generateLeads(
    @Body() body: {
      count: number;
      industry?: string;
      state?: string;
      includeProperty?: boolean;
    },
  ): Promise<{ leads: DemoLead[]; count: number }> {
    if (body.count < 1 || body.count > 2000) {
      throw new HttpException("Count must be between 1 and 2000", HttpStatus.BAD_REQUEST);
    }

    const leads = this.demoService.generateDemoLeads(body.count, {
      industry: body.industry,
      state: body.state,
      includeProperty: body.includeProperty,
    });

    this.logger.log(`[DEMO] Generated ${leads.length} demo leads`);

    return { leads, count: leads.length };
  }

  @Post("leads/import-csv")
  @ApiOperation({ summary: "Import leads from CSV string" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        csvData: { type: "string", description: "Raw CSV string with headers (first_name,last_name,phone,company,city,state)" },
      },
      required: ["csvData"],
    },
  })
  async importCSV(@Body() body: { csvData: string }): Promise<{ leads: DemoLead[]; count: number }> {
    if (!body.csvData) {
      throw new HttpException("csvData is required", HttpStatus.BAD_REQUEST);
    }

    const leads = this.demoService.parseCSVLeads(body.csvData);

    this.logger.log(`[DEMO] Parsed ${leads.length} leads from CSV data`);

    return { leads, count: leads.length };
  }

  @Post("leads/import-json")
  @ApiOperation({ summary: "Import leads from JSON array" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        jsonData: {
          type: "array",
          items: {
            type: "object",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              phone: { type: "string" },
              company: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
            },
          },
        },
      },
      required: ["jsonData"],
    },
  })
  async importJSON(@Body() body: { jsonData: unknown[] }): Promise<{ leads: DemoLead[]; count: number }> {
    const leads = this.demoService.parseJSONLeads(body.jsonData);

    this.logger.log(`[DEMO] Parsed ${leads.length} leads from JSON`);

    return { leads, count: leads.length };
  }

  @Post("leads/save")
  @ApiOperation({ summary: "Save leads to database" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        teamId: { type: "string" },
        leads: { type: "array" },
      },
      required: ["teamId", "leads"],
    },
  })
  async saveLeads(
    @Body() body: { teamId: string; leads: DemoLead[] },
  ): Promise<{ saved: number; leadIds: string[] }> {
    const result = await this.demoService.saveLeads(body.teamId, body.leads);

    this.logger.log(`[DEMO] Saved ${result.saved} leads for team ${body.teamId}`);

    return result;
  }

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  @Get("templates")
  @ApiOperation({ summary: "Get available SMS templates" })
  @ApiQuery({ name: "type", required: false })
  async getTemplates(@Query("type") type?: string): Promise<{
    types: string[];
    templates?: string[];
    followups?: Record<string, string[]>;
  }> {
    const types = this.demoService.getTemplateTypes();

    if (type) {
      const templates = this.demoService.getTemplates(type as any);
      return { types, templates };
    }

    return {
      types,
      followups: this.demoService.getFollowupTemplates(),
    };
  }

  // ===========================================================================
  // SMS PREVIEW & EXECUTION
  // ===========================================================================

  @Post("sms/preview")
  @ApiOperation({ summary: "Preview SMS messages before sending" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        teamId: { type: "string" },
        leadIds: { type: "array", items: { type: "string" } },
        templateType: { type: "string" },
        customTemplate: { type: "string" },
      },
      required: ["teamId", "leadIds"],
    },
  })
  async previewSms(
    @Body() body: {
      teamId: string;
      leadIds: string[];
      templateType?: string;
      customTemplate?: string;
    },
  ): Promise<{ previews: SmsPreview[]; count: number; estimatedCost: number }> {
    const previews = await this.demoService.previewSms(
      body.teamId,
      body.leadIds,
      body.templateType as any,
      body.customTemplate,
    );

    return {
      previews,
      count: previews.length,
      estimatedCost: previews.length * 0.0079,
    };
  }

  @Post("sms/execute")
  @ApiOperation({ summary: "Execute SMS batch (10-2000 messages)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        teamId: { type: "string" },
        leadIds: { type: "array", items: { type: "string" }, maxItems: 2000 },
        templateType: { type: "string" },
        customTemplate: { type: "string" },
        fromPhone: { type: "string" },
        campaignId: { type: "string" },
        dryRun: { type: "boolean", default: false },
      },
      required: ["teamId", "leadIds"],
    },
  })
  async executeSms(
    @Body() body: {
      teamId: string;
      leadIds: string[];
      templateType?: string;
      customTemplate?: string;
      fromPhone?: string;
      campaignId?: string;
      dryRun?: boolean;
    },
  ): Promise<SmsBatchResult> {
    if (body.leadIds.length < 1) {
      throw new HttpException("At least 1 lead required", HttpStatus.BAD_REQUEST);
    }

    if (body.leadIds.length > 2000) {
      throw new HttpException("Maximum 2000 leads per batch", HttpStatus.BAD_REQUEST);
    }

    const result = await this.demoService.executeBatch(
      body.teamId,
      body.leadIds,
      body.templateType as any,
      body.customTemplate,
      {
        fromPhone: body.fromPhone,
        campaignId: body.campaignId,
        dryRun: body.dryRun,
      },
    );

    this.logger.log(
      `[DEMO] ${body.dryRun ? "DRY RUN" : "EXECUTED"} batch ${result.batchId}: ${result.totalQueued} SMS`,
    );

    return result;
  }

  // ===========================================================================
  // FULL WORKFLOW: Generate -> Save -> Preview -> Execute
  // ===========================================================================

  @Post("workflow/full")
  @ApiOperation({ summary: "Full workflow: generate leads, save, preview, execute" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        teamId: { type: "string" },
        count: { type: "number", minimum: 10, maximum: 2000 },
        templateType: { type: "string" },
        customTemplate: { type: "string" },
        fromPhone: { type: "string" },
        industry: { type: "string" },
        state: { type: "string" },
        dryRun: { type: "boolean", default: true },
      },
      required: ["teamId", "count"],
    },
  })
  async fullWorkflow(
    @Body() body: {
      teamId: string;
      count: number;
      templateType?: string;
      customTemplate?: string;
      fromPhone?: string;
      industry?: string;
      state?: string;
      dryRun?: boolean;
    },
  ): Promise<{
    leads: { generated: number; saved: number };
    batch: SmsBatchResult;
  }> {
    // 1. Generate leads
    const leads = this.demoService.generateDemoLeads(body.count, {
      industry: body.industry,
      state: body.state,
    });

    // 2. Save to database
    const saveResult = await this.demoService.saveLeads(body.teamId, leads);

    // 3. Execute batch
    const batchResult = await this.demoService.executeBatch(
      body.teamId,
      saveResult.leadIds,
      body.templateType as any,
      body.customTemplate,
      {
        fromPhone: body.fromPhone,
        dryRun: body.dryRun ?? true,
      },
    );

    this.logger.log(
      `[DEMO] Full workflow: ${leads.length} generated, ${saveResult.saved} saved, ${batchResult.totalQueued} queued`,
    );

    return {
      leads: { generated: leads.length, saved: saveResult.saved },
      batch: batchResult,
    };
  }

  // ===========================================================================
  // CONVERSATIONAL AUTO-RESPONSE
  // ===========================================================================

  @Post("conversation/simulate")
  @ApiOperation({ summary: "Simulate a conversation turn" })
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
  async simulateConversation(
    @Body() body: { teamId: string; leadId: string; message: string },
  ): Promise<ConversationResult> {
    return this.demoService.simulateConversation(body.teamId, body.leadId, body.message);
  }

  @Post("conversation/respond")
  @ApiOperation({ summary: "Process inbound message and auto-respond" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        teamId: { type: "string" },
        leadId: { type: "string" },
        message: { type: "string" },
        fromPhone: { type: "string" },
        toPhone: { type: "string" },
        autoSend: { type: "boolean", default: false },
      },
      required: ["teamId", "leadId", "message", "fromPhone", "toPhone"],
    },
  })
  async processAndRespond(
    @Body() body: {
      teamId: string;
      leadId: string;
      message: string;
      fromPhone: string;
      toPhone: string;
      autoSend?: boolean;
    },
  ): Promise<{
    response: string;
    agent: string;
    sent: boolean;
    messageId?: string;
  }> {
    return this.demoService.processInboundAndRespond(
      body.teamId,
      body.leadId,
      body.message,
      body.fromPhone,
      body.toPhone,
      body.autoSend,
    );
  }

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  @Get("health")
  async healthCheck(): Promise<{
    status: string;
    module: string;
    features: string[];
    timestamp: string;
  }> {
    return {
      status: "healthy",
      module: "DEMO",
      features: [
        "lead_generation",
        "csv_import",
        "json_import",
        "sms_preview",
        "sms_batch_execution",
        "conversational_auto_response",
        "stratton_oakmont_templates",
        "response_templates",
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // RESPONSE TEMPLATES
  // ===========================================================================

  @Post("templates/create")
  @ApiOperation({ summary: "Create a response template" })
  async createTemplate(@Body() body: TemplateCreate) {
    return this.templateService.create(body);
  }

  @Get("templates/list")
  @ApiOperation({ summary: "Get all templates for a team" })
  @ApiQuery({ name: "teamId", required: true })
  @ApiQuery({ name: "agentType", required: false })
  @ApiQuery({ name: "category", required: false })
  async listTemplates(
    @Query("teamId") teamId: string,
    @Query("agentType") agentType?: string,
    @Query("category") category?: string,
  ) {
    return this.templateService.getByTeam(teamId, agentType, category);
  }

  @Post("templates/update/:id")
  @ApiOperation({ summary: "Update a template" })
  async updateTemplate(
    @Query("id") id: string,
    @Body() body: { name?: string; template?: string; isActive?: boolean; priority?: number },
  ) {
    return this.templateService.update(id, body);
  }

  @Post("templates/toggle/:id")
  @ApiOperation({ summary: "Toggle template active status" })
  async toggleTemplate(@Query("id") id: string) {
    return this.templateService.toggle(id);
  }

  @Post("templates/delete/:id")
  @ApiOperation({ summary: "Delete a template" })
  async deleteTemplate(@Query("id") id: string) {
    await this.templateService.delete(id);
    return { success: true };
  }

  @Post("templates/seed")
  @ApiOperation({ summary: "Seed default templates for a team" })
  async seedTemplates(@Body() body: { teamId: string }) {
    const count = await this.templateService.seedDefaults(body.teamId);
    return { seeded: count };
  }
}
