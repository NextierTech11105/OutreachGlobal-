import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { eq, and, inArray } from "drizzle-orm";
import { leadsTable, messagesTable, campaignsTable } from "@/database/schema-alias";
import { GiannaService } from "../gianna/gianna.service";
import { CathyService } from "../cathy/cathy.service";
import { AgentRouterService } from "../inbox/services/agent-router.service";
import { SabrinaSdrService } from "../inbox/services/sabrina-sdr.service";
import { AiOrchestratorService } from "../ai-orchestrator/ai-orchestrator.service";
import { ConfigService } from "@nestjs/config";
import { v4 as uuid } from "uuid";
import { MessageDirection, MessageType } from "@nextier/common";
import { DEMO_QUEUE } from "./demo.constants";

/**
 * DEMO SERVICE - Full Demo-Ready SMS Platform
 *
 * Stratton Oakmont Structure:
 * 1. HOOK - Grab attention immediately
 * 2. VALUE - What's in it for them (specific, tangible)
 * 3. SCARCITY - Why now (limited spots, timing)
 * 4. CTA - Clear next step (one action only)
 *
 * Supports:
 * - Simulated lead generation for demos
 * - Real data import (CSV/JSON)
 * - SMS preview with personalization
 * - Batch execution (10-2000 SMS)
 * - Conversational auto-response
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DemoLead {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
  industry?: string;
  city?: string;
  state?: string;
  email?: string;
  source?: string;
}

export interface SmsPreview {
  leadId: string;
  leadName: string;
  phone: string;
  message: string;
  template: string;
  personalizations: Record<string, string>;
  estimatedDelivery: string;
}

export interface SmsBatchResult {
  batchId: string;
  totalQueued: number;
  estimatedCost: number;
  estimatedDeliveryTime: string;
  previews: SmsPreview[];
}

export interface ConversationTurn {
  role: "lead" | "agent";
  message: string;
  timestamp: Date;
  agent?: "gianna" | "cathy" | "sabrina";
  sentiment?: "positive" | "negative" | "neutral";
}

export interface ConversationResult {
  leadId: string;
  conversation: ConversationTurn[];
  currentAgent: "gianna" | "cathy" | "sabrina";
  nextAction: "continue" | "schedule" | "nurture" | "dnc" | "human";
  suggestedResponse?: string;
}

// =============================================================================
// STRATTON OAKMONT TEMPLATES
// =============================================================================

const OPENER_TEMPLATES = {
  // Property/Real Estate
  property_direct: [
    "Hey {firstName}, saw your property on {street}. Got a cash buyer looking in {city} - interested in a no-obligation offer?",
    "{firstName} - quick question: if I could get you a cash offer on {street} within 48 hours, no repairs needed, would that interest you?",
    "Hi {firstName}! I help property owners in {city} sell fast for cash. Any chance you'd consider an offer on {street}?",
  ],
  property_investor: [
    "{firstName}, I noticed you own {street}. My investors are actively buying in {city} - can I send you a no-strings-attached offer?",
    "Hey {firstName} - we're buying {count} properties in {state} this month. {street} caught my eye. Open to discussing?",
  ],

  // Business/B2B
  business_direct: [
    "Hey {firstName}, I work with {industry} businesses in {city}. Got 5 mins this week to chat about how we're helping similar companies?",
    "{firstName} - quick one: we just saved a {industry} company in {state} 40% on their costs. Worth a 10-min call?",
    "Hi {firstName}! Reaching out because {company} fits the exact profile of businesses we help grow. Free for a quick chat?",
  ],
  business_owner: [
    "{firstName}, I see you run {company}. We specialize in helping {industry} owners like you - got 5 mins?",
    "Hey {firstName} - love what {company} is doing. We've helped similar {industry} businesses scale. Quick call this week?",
  ],

  // General/Universal
  general: [
    "Hey {firstName}! Quick question - do you have 2 minutes to chat about something that could benefit you?",
    "{firstName} - hope I'm not catching you at a bad time. Got something relevant for folks in {city}. Interested?",
    "Hi {firstName}, this is {agentName}. I help people in {state} with [value prop]. Got a sec?",
  ],
};

const FOLLOWUP_TEMPLATES = {
  no_response_1: [
    "Hey {firstName}, just following up - did you get my last message?",
    "{firstName} - circling back. Still interested in chatting?",
    "Hi {firstName}! Wanted to make sure my message didn't get lost. Any interest?",
  ],
  no_response_2: [
    "{firstName} - I know you're busy. Just need a quick yes or no - worth a 5 min call?",
    "Last try {firstName} - if timing isn't right, totally understand. Just let me know!",
  ],
  positive_response: [
    "Awesome {firstName}! When works best for a quick call - morning or afternoon?",
    "Great to hear! I've got some time tomorrow. What works for you?",
    "Perfect {firstName}! Let me send you some times - what's your schedule like?",
  ],
  question_response: [
    "Great question {firstName}! In short: [answer]. Want me to explain more on a quick call?",
    "Happy to clarify {firstName}. The quick version is [answer]. Make sense?",
  ],
  objection_timing: [
    "Totally get it {firstName}. When would be a better time to reconnect?",
    "No problem at all. Mind if I check back in a few weeks?",
  ],
  objection_not_interested: [
    "Understood {firstName}. Mind if I ask what changed your mind?",
    "No worries at all. If anything changes, you know where to find me!",
  ],
};

// Simulated lead data for demos
const DEMO_FIRST_NAMES = ["Michael", "Sarah", "John", "Emily", "David", "Jessica", "James", "Ashley", "Robert", "Amanda", "William", "Jennifer", "Thomas", "Nicole", "Christopher", "Stephanie", "Daniel", "Michelle", "Matthew", "Melissa"];
const DEMO_LAST_NAMES = ["Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee"];
const DEMO_COMPANIES = ["ABC Realty", "Peak Properties", "Summit Investments", "Valley Homes", "Golden Gate Real Estate", "Sunrise Properties", "Blue Sky Realty", "Metro Investments", "Crown Properties", "Elite Homes"];
const DEMO_INDUSTRIES = ["Real Estate", "Property Management", "Construction", "Home Services", "Insurance", "Financial Services", "Healthcare", "Retail", "Manufacturing", "Technology"];
const DEMO_CITIES = ["Austin", "Dallas", "Houston", "Phoenix", "Denver", "Atlanta", "Miami", "Tampa", "Orlando", "Charlotte"];
const DEMO_STATES = ["TX", "AZ", "CO", "GA", "FL", "NC", "CA", "NV", "TN", "SC"];
const DEMO_STREETS = ["123 Oak Lane", "456 Maple Dr", "789 Pine St", "321 Cedar Ave", "654 Elm Rd", "987 Birch Blvd", "147 Willow Way", "258 Aspen Ct", "369 Spruce Ln", "741 Cypress Dr"];

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    @InjectQueue(DEMO_QUEUE) private demoQueue: Queue,
    private giannaService: GiannaService,
    private cathyService: CathyService,
    private agentRouter: AgentRouterService,
    private sabrinaSdr: SabrinaSdrService,
    private aiOrchestrator: AiOrchestratorService,
    private config: ConfigService,
  ) {}

  // ===========================================================================
  // LEAD GENERATION
  // ===========================================================================

  /**
   * Generate simulated leads for demo purposes
   */
  generateDemoLeads(count: number, options?: {
    industry?: string;
    state?: string;
    includeProperty?: boolean;
  }): DemoLead[] {
    const leads: DemoLead[] = [];

    for (let i = 0; i < count; i++) {
      const firstName = DEMO_FIRST_NAMES[Math.floor(Math.random() * DEMO_FIRST_NAMES.length)];
      const lastName = DEMO_LAST_NAMES[Math.floor(Math.random() * DEMO_LAST_NAMES.length)];
      const city = DEMO_CITIES[Math.floor(Math.random() * DEMO_CITIES.length)];
      const state = options?.state || DEMO_STATES[Math.floor(Math.random() * DEMO_STATES.length)];

      leads.push({
        id: uuid(),
        firstName,
        lastName,
        phone: this.generateFakePhone(),
        company: options?.includeProperty ? undefined : DEMO_COMPANIES[Math.floor(Math.random() * DEMO_COMPANIES.length)],
        industry: options?.industry || DEMO_INDUSTRIES[Math.floor(Math.random() * DEMO_INDUSTRIES.length)],
        city,
        state,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        source: "demo_generated",
      });
    }

    return leads;
  }

  /**
   * Import leads from CSV data
   */
  parseCSVLeads(csvData: string): DemoLead[] {
    const lines = csvData.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const leads: DemoLead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};

      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      // Map common CSV column names
      const lead: DemoLead = {
        id: uuid(),
        firstName: row["first_name"] || row["firstname"] || row["first"] || "",
        lastName: row["last_name"] || row["lastname"] || row["last"] || "",
        phone: this.normalizePhone(row["phone"] || row["mobile"] || row["cell"] || ""),
        company: row["company"] || row["company_name"] || row["business"] || undefined,
        industry: row["industry"] || row["sector"] || undefined,
        city: row["city"] || undefined,
        state: row["state"] || row["st"] || undefined,
        email: row["email"] || undefined,
        source: "csv_import",
      };

      if (lead.firstName && lead.phone) {
        leads.push(lead);
      }
    }

    return leads;
  }

  /**
   * Import leads from JSON data
   */
  parseJSONLeads(jsonData: unknown[]): DemoLead[] {
    return jsonData.map((item: any) => ({
      id: uuid(),
      firstName: item.firstName || item.first_name || item.first || "",
      lastName: item.lastName || item.last_name || item.last || "",
      phone: this.normalizePhone(item.phone || item.mobile || item.cell || ""),
      company: item.company || item.companyName || item.company_name || undefined,
      industry: item.industry || undefined,
      city: item.city || undefined,
      state: item.state || undefined,
      email: item.email || undefined,
      source: "json_import",
    })).filter(l => l.firstName && l.phone);
  }

  /**
   * Save leads to database
   */
  async saveLeads(teamId: string, leads: DemoLead[]): Promise<{ saved: number; leadIds: string[] }> {
    const leadIds: string[] = [];

    for (const lead of leads) {
      try {
        const leadId = lead.id || uuid();
        await this.db.insert(leadsTable).values({
          id: leadId,
          teamId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          email: lead.email,
          source: lead.source || "demo",
          pipelineStatus: "raw",
        }).onConflictDoNothing();

        leadIds.push(leadId);
      } catch (err) {
        this.logger.warn(`Failed to save lead: ${err}`);
      }
    }

    return { saved: leadIds.length, leadIds };
  }

  // ===========================================================================
  // SMS PREVIEW & EXECUTION
  // ===========================================================================

  /**
   * Preview SMS messages before sending
   */
  async previewSms(
    teamId: string,
    leadIds: string[],
    templateType: keyof typeof OPENER_TEMPLATES = "general",
    customTemplate?: string,
  ): Promise<SmsPreview[]> {
    const previews: SmsPreview[] = [];

    // Get leads
    const leads = await this.db.query.leads.findMany({
      where: and(
        eq(leadsTable.teamId, teamId),
        inArray(leadsTable.id, leadIds),
      ),
    });

    // Filter leads with valid phone numbers
    const leadsWithPhones = leads.filter(lead => lead.phone);

    for (const lead of leadsWithPhones) {
      // Select template
      const templates = OPENER_TEMPLATES[templateType] || OPENER_TEMPLATES.general;
      const template = customTemplate || templates[Math.floor(Math.random() * templates.length)];

      // Personalize
      const personalizations: Record<string, string> = {
        firstName: lead.firstName || "there",
        lastName: lead.lastName || "",
        company: lead.company || "your company",
        city: lead.city || "your area",
        state: lead.state || "",
        street: lead.address || "your property",
        industry: "your industry",
        agentName: "Gianna",
        count: String(Math.floor(Math.random() * 10) + 3),
      };

      let message = template;
      for (const [key, value] of Object.entries(personalizations)) {
        message = message.replace(new RegExp(`\\{${key}\\}`, "g"), value);
      }

      previews.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`.trim(),
        phone: lead.phone!, // Safe assertion after filter
        message,
        template,
        personalizations,
        estimatedDelivery: "< 5 seconds",
      });
    }

    return previews;
  }

  /**
   * Execute SMS batch - send 10 to 2000 messages
   */
  async executeBatch(
    teamId: string,
    leadIds: string[],
    templateType: keyof typeof OPENER_TEMPLATES = "general",
    customTemplate?: string,
    options?: {
      fromPhone?: string;
      campaignId?: string;
      dryRun?: boolean;
    },
  ): Promise<SmsBatchResult> {
    const batchId = uuid();
    const previews = await this.previewSms(teamId, leadIds, templateType, customTemplate);

    if (options?.dryRun) {
      return {
        batchId,
        totalQueued: previews.length,
        estimatedCost: previews.length * 0.0079, // ~$0.0079 per SMS
        estimatedDeliveryTime: `${Math.ceil(previews.length / 100)} seconds`,
        previews: previews.slice(0, 10), // Only show first 10 in preview
      };
    }

    // Get from phone
    const fromPhone = options?.fromPhone || this.config.get("GIANNA_PHONE_NUMBER") || this.config.get("SIGNALHOUSE_DEFAULT_NUMBER");

    // Queue all SMS
    for (const preview of previews) {
      await this.demoQueue.add(
        "send-sms",
        {
          teamId,
          leadId: preview.leadId,
          toPhone: preview.phone,
          fromPhone,
          message: preview.message,
          campaignId: options?.campaignId,
          batchId,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        },
      );

      // Log outbound message
      await this.db.insert(messagesTable).values({
        teamId,
        leadId: preview.leadId,
        body: preview.message,
        type: MessageType.SMS,
        direction: MessageDirection.OUTBOUND,
        fromAddress: fromPhone,
        toAddress: preview.phone,
        metadata: { batchId, templateType, source: "demo_batch" },
      });
    }

    this.logger.log(`[DEMO] Queued ${previews.length} SMS messages in batch ${batchId}`);

    return {
      batchId,
      totalQueued: previews.length,
      estimatedCost: previews.length * 0.0079,
      estimatedDeliveryTime: `${Math.ceil(previews.length / 100)} seconds`,
      previews: previews.slice(0, 10),
    };
  }

  // ===========================================================================
  // CONVERSATIONAL AUTO-RESPONSE
  // ===========================================================================

  /**
   * Simulate a conversation with auto-responses
   */
  async simulateConversation(
    teamId: string,
    leadId: string,
    incomingMessage: string,
  ): Promise<ConversationResult> {
    // Get conversation history
    const messages = await this.db.query.messages.findMany({
      where: eq(messagesTable.leadId, leadId),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
      limit: 20,
    });

    const conversation: ConversationTurn[] = messages.map(m => ({
      role: m.direction === MessageDirection.INBOUND ? "lead" : "agent",
      message: m.body || "",
      timestamp: m.createdAt,
      agent: (m.metadata as any)?.agent,
    }));

    // Add incoming message
    conversation.push({
      role: "lead",
      message: incomingMessage,
      timestamp: new Date(),
      sentiment: this.classifySentiment(incomingMessage),
    });

    // Route to appropriate agent
    const routing = await this.agentRouter.routeToAgent(
      teamId,
      leadId,
      incomingMessage,
    );

    let suggestedResponse = "";
    let nextAction: "continue" | "schedule" | "nurture" | "dnc" | "human" = "continue";

    // Generate response based on agent
    switch (routing.agent) {
      case "gianna":
        const giannaResult = await this.giannaService.processIncomingResponse(
          incomingMessage,
          {
            teamId,
            leadId,
            firstName: "Lead",
            phone: "",
            messageNumber: conversation.filter(c => c.role === "agent").length + 1,
          },
        );
        suggestedResponse = giannaResult.message;
        if (giannaResult.intent === "scheduling") nextAction = "schedule";
        if (giannaResult.requiresHumanReview) nextAction = "human";
        break;

      case "cathy":
        const cathyResult = await this.cathyService.processResponse(teamId, leadId, incomingMessage);
        suggestedResponse = cathyResult.suggestedResponse;
        if (cathyResult.shouldEscalate) {
          nextAction = cathyResult.escalateTo === "sabrina" ? "schedule" : "human";
        }
        break;

      case "sabrina":
        const sabrinaResult = await this.sabrinaSdr.processIncomingResponse(
          teamId,
          uuid(),
          incomingMessage,
          "",
        );
        suggestedResponse = sabrinaResult.suggestedResponse || "";
        nextAction = "schedule";
        break;
    }

    // Check for DNC
    if (/\b(stop|unsubscribe|remove|opt out)\b/i.test(incomingMessage)) {
      nextAction = "dnc";
      suggestedResponse = "No problem at all! You've been removed from our list. Take care!";
    }

    // Add agent response to conversation
    if (suggestedResponse) {
      conversation.push({
        role: "agent",
        message: suggestedResponse,
        timestamp: new Date(),
        agent: routing.agent,
      });
    }

    return {
      leadId,
      conversation,
      currentAgent: routing.agent,
      nextAction,
      suggestedResponse,
    };
  }

  /**
   * Process real inbound message and auto-respond
   */
  async processInboundAndRespond(
    teamId: string,
    leadId: string,
    incomingMessage: string,
    fromPhone: string,
    toPhone: string,
    autoSend: boolean = false,
  ): Promise<{
    response: string;
    agent: string;
    sent: boolean;
    messageId?: string;
  }> {
    // Log inbound
    await this.db.insert(messagesTable).values({
      teamId,
      leadId,
      body: incomingMessage,
      type: MessageType.SMS,
      direction: MessageDirection.INBOUND,
      fromAddress: fromPhone,
      toAddress: toPhone,
      metadata: { source: "demo_inbound" },
    });

    // Get response
    const result = await this.simulateConversation(teamId, leadId, incomingMessage);

    if (!result.suggestedResponse) {
      return {
        response: "",
        agent: result.currentAgent,
        sent: false,
      };
    }

    // Auto-send if enabled
    if (autoSend && result.nextAction !== "dnc" && result.nextAction !== "human") {
      const messageId = uuid();

      // Log outbound
      await this.db.insert(messagesTable).values({
        teamId,
        leadId,
        body: result.suggestedResponse,
        type: MessageType.SMS,
        direction: MessageDirection.OUTBOUND,
        fromAddress: toPhone,
        toAddress: fromPhone,
        metadata: { agent: result.currentAgent, source: "demo_auto_respond", messageId },
      });

      // Queue for sending
      await this.demoQueue.add("send-sms", {
        teamId,
        leadId,
        toPhone: fromPhone,
        fromPhone: toPhone,
        message: result.suggestedResponse,
      });

      return {
        response: result.suggestedResponse,
        agent: result.currentAgent,
        sent: true,
        messageId,
      };
    }

    return {
      response: result.suggestedResponse,
      agent: result.currentAgent,
      sent: false,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private generateFakePhone(): string {
    // Generate valid-looking US phone (555-xxxx for demo)
    const area = ["512", "214", "713", "602", "303", "404", "305", "813", "407", "704"][Math.floor(Math.random() * 10)];
    const prefix = String(Math.floor(Math.random() * 900) + 100);
    const line = String(Math.floor(Math.random() * 9000) + 1000);
    return `${area}${prefix}${line}`;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "").slice(-10);
  }

  private classifySentiment(message: string): "positive" | "negative" | "neutral" {
    const lower = message.toLowerCase();

    if (/\b(yes|yeah|sure|interested|great|love|sounds good|perfect|absolutely)\b/.test(lower)) {
      return "positive";
    }
    if (/\b(no|stop|not interested|leave me alone|remove|unsubscribe)\b/.test(lower)) {
      return "negative";
    }
    return "neutral";
  }

  /**
   * Get available template types
   */
  getTemplateTypes(): string[] {
    return Object.keys(OPENER_TEMPLATES);
  }

  /**
   * Get templates by type
   */
  getTemplates(type: keyof typeof OPENER_TEMPLATES): string[] {
    return OPENER_TEMPLATES[type] || [];
  }

  /**
   * Get followup templates
   */
  getFollowupTemplates(): typeof FOLLOWUP_TEMPLATES {
    return FOLLOWUP_TEMPLATES;
  }
}
