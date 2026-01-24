import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc } from "drizzle-orm";
import { autoRespondTemplates } from "@/database/schema/auto-respond-templates.schema";

/**
 * TEMPLATE SERVICE - Manage Conversational Response Templates
 *
 * Create, manage, and retrieve pre-loaded response templates
 * for GIANNA, CATHY, and SABRINA agents.
 */

export interface TemplateCreate {
  teamId: string;
  agentType: "GIANNA" | "CATHY" | "SABRINA";
  category: "opener" | "followUp" | "objection" | "booking" | "nudge" | "positive" | "neutral" | "dnc";
  name: string;
  template: string;
  variables?: Array<{ name: string; required: boolean; default?: string }>;
  priority?: number;
}

export interface TemplateUpdate {
  name?: string;
  template?: string;
  variables?: Array<{ name: string; required: boolean; default?: string }>;
  isActive?: boolean;
  priority?: number;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Create a new response template
   */
  async create(data: TemplateCreate) {
    const [template] = await this.db
      .insert(autoRespondTemplates)
      .values({
        teamId: data.teamId,
        agentType: data.agentType,
        category: data.category,
        name: data.name,
        template: data.template,
        variables: data.variables || [],
        priority: data.priority || 0,
        isActive: true,
      })
      .returning();

    this.logger.log(`Created template: ${data.name} for ${data.agentType}`);
    return template;
  }

  /**
   * Get all templates for a team
   */
  async getByTeam(teamId: string, agentType?: string, category?: string) {
    let query = this.db
      .select()
      .from(autoRespondTemplates)
      .where(eq(autoRespondTemplates.teamId, teamId))
      .orderBy(desc(autoRespondTemplates.priority));

    const templates = await query;

    // Filter in JS for flexibility
    return templates.filter(t => {
      if (agentType && t.agentType !== agentType) return false;
      if (category && t.category !== category) return false;
      return true;
    });
  }

  /**
   * Get active templates for an agent response
   */
  async getActiveTemplates(teamId: string, agentType: string, category: string) {
    return this.db
      .select()
      .from(autoRespondTemplates)
      .where(
        and(
          eq(autoRespondTemplates.teamId, teamId),
          eq(autoRespondTemplates.agentType, agentType),
          eq(autoRespondTemplates.category, category),
          eq(autoRespondTemplates.isActive, true),
        ),
      )
      .orderBy(desc(autoRespondTemplates.priority));
  }

  /**
   * Get best matching template for a response
   */
  async getBestTemplate(teamId: string, agentType: string, category: string) {
    const templates = await this.getActiveTemplates(teamId, agentType, category);
    return templates[0] || null;
  }

  /**
   * Update a template
   */
  async update(templateId: string, data: TemplateUpdate) {
    const [updated] = await this.db
      .update(autoRespondTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(autoRespondTemplates.id, templateId))
      .returning();

    return updated;
  }

  /**
   * Toggle template active status
   */
  async toggle(templateId: string) {
    const [template] = await this.db
      .select()
      .from(autoRespondTemplates)
      .where(eq(autoRespondTemplates.id, templateId));

    if (!template) return null;

    const [updated] = await this.db
      .update(autoRespondTemplates)
      .set({ isActive: !template.isActive, updatedAt: new Date() })
      .where(eq(autoRespondTemplates.id, templateId))
      .returning();

    return updated;
  }

  /**
   * Delete a template
   */
  async delete(templateId: string) {
    await this.db
      .delete(autoRespondTemplates)
      .where(eq(autoRespondTemplates.id, templateId));
  }

  /**
   * Record template usage
   */
  async recordUsage(templateId: string) {
    const [template] = await this.db
      .select()
      .from(autoRespondTemplates)
      .where(eq(autoRespondTemplates.id, templateId));

    if (template) {
      await this.db
        .update(autoRespondTemplates)
        .set({
          usageCount: (template.usageCount || 0) + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(autoRespondTemplates.id, templateId));
    }
  }

  /**
   * Personalize a template with variables
   */
  personalize(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  /**
   * Seed default templates for a team
   */
  async seedDefaults(teamId: string) {
    const defaults: TemplateCreate[] = [
      // GIANNA - Opener responses
      {
        teamId,
        agentType: "GIANNA",
        category: "positive",
        name: "Interested - Schedule Call",
        template: "Great to hear {firstName}! I'd love to chat more. Do you have 5 mins today or tomorrow?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 100,
      },
      {
        teamId,
        agentType: "GIANNA",
        category: "positive",
        name: "Interested - More Info",
        template: "Awesome {firstName}! Here's the quick version: [value prop]. Want me to send more details?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 90,
      },
      {
        teamId,
        agentType: "GIANNA",
        category: "neutral",
        name: "Question Response",
        template: "Good question {firstName}! [answer]. Does that help?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 80,
      },
      {
        teamId,
        agentType: "GIANNA",
        category: "objection",
        name: "Timing Objection",
        template: "Totally understand {firstName}. When would be a better time to reconnect?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 70,
      },

      // CATHY - Nurture responses
      {
        teamId,
        agentType: "CATHY",
        category: "nudge",
        name: "Gentle Follow-up",
        template: "Hey {firstName}, just checking in! Still interested in chatting?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 100,
      },
      {
        teamId,
        agentType: "CATHY",
        category: "positive",
        name: "Re-engaged Lead",
        template: "Welcome back {firstName}! Ready to pick up where we left off?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 90,
      },

      // SABRINA - Closer responses
      {
        teamId,
        agentType: "SABRINA",
        category: "booking",
        name: "Schedule Meeting",
        template: "Perfect {firstName}! I have openings at [times]. Which works for you?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 100,
      },
      {
        teamId,
        agentType: "SABRINA",
        category: "positive",
        name: "Confirm Interest",
        template: "Excellent {firstName}! Before we schedule, quick question: [qualifier]?",
        variables: [{ name: "firstName", required: true, default: "there" }],
        priority: 90,
      },

      // DNC responses (all agents)
      {
        teamId,
        agentType: "GIANNA",
        category: "dnc",
        name: "Opt-out Confirmation",
        template: "No problem at all! You've been removed from our list. Take care!",
        variables: [],
        priority: 100,
      },
    ];

    for (const template of defaults) {
      await this.create(template);
    }

    this.logger.log(`Seeded ${defaults.length} default templates for team ${teamId}`);
    return defaults.length;
  }
}
