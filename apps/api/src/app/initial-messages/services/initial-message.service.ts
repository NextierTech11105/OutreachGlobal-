import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc, ilike, count } from "drizzle-orm";
import {
  initialMessagesTable,
  campaignInitialMessagesTable,
  sdrCampaignConfigsTable,
} from "@/database/schema-alias";
import { InitialMessageCategory, MessageTone } from "@nextier/common";
import { InitialMessageFilter } from "../types/initial-message.type";
import { ModelNotFoundError } from "@/database/exceptions";

@Injectable()
export class InitialMessageService {
  private readonly logger = new Logger(InitialMessageService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Paginate initial messages
   */
  async paginate(args: InitialMessageFilter & { first?: number; after?: string }) {
    const { teamId, category, tone, isActive, sdrId, searchQuery } = args;

    const conditions = [eq(initialMessagesTable.teamId, teamId)];

    if (category) conditions.push(eq(initialMessagesTable.category, category));
    if (tone) conditions.push(eq(initialMessagesTable.tone, tone));
    if (isActive !== undefined) conditions.push(eq(initialMessagesTable.isActive, isActive));
    if (sdrId) conditions.push(eq(initialMessagesTable.defaultSdrId, sdrId));
    if (searchQuery) {
      conditions.push(ilike(initialMessagesTable.name, `%${searchQuery}%`));
    }

    const messages = await this.db.query.initialMessages.findMany({
      where: and(...conditions),
      orderBy: [desc(initialMessagesTable.positiveResponseRate), desc(initialMessagesTable.timesUsed)],
      limit: args.first ?? 50,
    });

    return {
      edges: messages.map((msg) => ({ node: msg, cursor: msg.id })),
      pageInfo: {
        hasNextPage: messages.length === (args.first ?? 50),
        hasPreviousPage: false,
        startCursor: messages[0]?.id,
        endCursor: messages[messages.length - 1]?.id,
      },
    };
  }

  /**
   * Find one initial message
   */
  async findOne(teamId: string, id: string) {
    return this.db.query.initialMessages.findFirst({
      where: and(eq(initialMessagesTable.teamId, teamId), eq(initialMessagesTable.id, id)),
    });
  }

  /**
   * Find one or throw
   */
  async findOneOrFail(teamId: string, id: string) {
    const message = await this.findOne(teamId, id);
    if (!message) throw new ModelNotFoundError("Initial message not found");
    return message;
  }

  /**
   * Create initial message
   */
  async create(
    teamId: string,
    data: {
      name: string;
      content: string;
      category: InitialMessageCategory;
      description?: string;
      tone?: MessageTone;
      tags?: string[];
      defaultSdrId?: string;
    }
  ) {
    const [message] = await this.db
      .insert(initialMessagesTable)
      .values({
        teamId,
        name: data.name,
        content: data.content,
        category: data.category,
        description: data.description,
        tone: data.tone || MessageTone.PROFESSIONAL,
        tags: data.tags || [],
        defaultSdrId: data.defaultSdrId,
        timesUsed: 0,
      })
      .returning();

    this.logger.log(`Created initial message: ${message.name}`);
    return { initialMessage: message };
  }

  /**
   * Update initial message
   */
  async update(teamId: string, id: string, data: Partial<typeof initialMessagesTable.$inferInsert>) {
    const [message] = await this.db
      .update(initialMessagesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(initialMessagesTable.teamId, teamId), eq(initialMessagesTable.id, id)))
      .returning();

    if (!message) throw new ModelNotFoundError("Initial message not found");
    return { initialMessage: message };
  }

  /**
   * Delete initial message
   */
  async delete(teamId: string, id: string) {
    const [deleted] = await this.db
      .delete(initialMessagesTable)
      .where(and(eq(initialMessagesTable.teamId, teamId), eq(initialMessagesTable.id, id)))
      .returning();

    if (!deleted) throw new ModelNotFoundError("Initial message not found");
    return { deletedInitialMessageId: id };
  }

  /**
   * Create message variant for A/B testing
   */
  async createVariant(teamId: string, parentMessageId: string, variantName: string, content: string) {
    const parent = await this.findOneOrFail(teamId, parentMessageId);

    const [variant] = await this.db
      .insert(initialMessagesTable)
      .values({
        teamId,
        name: `${parent.name} - ${variantName}`,
        content,
        category: parent.category,
        tone: parent.tone,
        tags: parent.tags,
        defaultSdrId: parent.defaultSdrId,
        isVariant: true,
        parentMessageId,
        variantName,
        timesUsed: 0,
      })
      .returning();

    return { initialMessage: variant };
  }

  /**
   * Assign message to campaign
   */
  async assignToCampaign(
    teamId: string,
    campaignId: string,
    initialMessageId: string,
    options?: { assignedSdrId?: string; position?: number; weight?: number }
  ) {
    // Verify message exists
    await this.findOneOrFail(teamId, initialMessageId);

    const [assignment] = await this.db
      .insert(campaignInitialMessagesTable)
      .values({
        campaignId,
        initialMessageId,
        assignedSdrId: options?.assignedSdrId,
        position: options?.position ?? 0,
        weight: options?.weight ?? 100,
        sentCount: 0,
        responseCount: 0,
        positiveResponseCount: 0,
      })
      .returning();

    return { assignment };
  }

  /**
   * Remove message from campaign
   */
  async removeFromCampaign(campaignId: string, initialMessageId: string) {
    const [deleted] = await this.db
      .delete(campaignInitialMessagesTable)
      .where(
        and(
          eq(campaignInitialMessagesTable.campaignId, campaignId),
          eq(campaignInitialMessagesTable.initialMessageId, initialMessageId)
        )
      )
      .returning();

    if (!deleted) throw new ModelNotFoundError("Campaign message assignment not found");
    return { removedAssignmentId: deleted.id };
  }

  /**
   * Get messages for a campaign
   */
  async getCampaignMessages(campaignId: string) {
    return this.db.query.campaignInitialMessages.findMany({
      where: eq(campaignInitialMessagesTable.campaignId, campaignId),
      orderBy: [campaignInitialMessagesTable.position],
    });
  }

  /**
   * Get or create SDR campaign config
   */
  async getOrCreateSdrConfig(teamId: string, sdrId: string, campaignId: string) {
    let config = await this.db.query.sdrCampaignConfigs.findFirst({
      where: and(
        eq(sdrCampaignConfigsTable.sdrId, sdrId),
        eq(sdrCampaignConfigsTable.campaignId, campaignId)
      ),
    });

    if (!config) {
      [config] = await this.db
        .insert(sdrCampaignConfigsTable)
        .values({
          teamId,
          sdrId,
          campaignId,
        })
        .returning();
    }

    return config;
  }

  /**
   * Update SDR campaign config
   */
  async updateSdrConfig(
    teamId: string,
    sdrId: string,
    campaignId: string,
    data: Partial<typeof sdrCampaignConfigsTable.$inferInsert>
  ) {
    // Get or create config first
    await this.getOrCreateSdrConfig(teamId, sdrId, campaignId);

    const [config] = await this.db
      .update(sdrCampaignConfigsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(sdrCampaignConfigsTable.sdrId, sdrId),
          eq(sdrCampaignConfigsTable.campaignId, campaignId)
        )
      )
      .returning();

    return { config };
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(teamId: string) {
    const messages = await this.db.query.initialMessages.findMany({
      where: eq(initialMessagesTable.teamId, teamId),
    });

    const categoryMap = new Map<string, { count: number; activeCount: number; totalResponseRate: number }>();

    for (const msg of messages) {
      const existing = categoryMap.get(msg.category) || { count: 0, activeCount: 0, totalResponseRate: 0 };
      existing.count++;
      if (msg.isActive) existing.activeCount++;
      existing.totalResponseRate += msg.responseRate || 0;
      categoryMap.set(msg.category, existing);
    }

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      activeCount: stats.activeCount,
      avgResponseRate: stats.count > 0 ? Math.round(stats.totalResponseRate / stats.count) : 0,
    }));
  }

  /**
   * Get top performing messages
   */
  async getTopPerforming(teamId: string, category?: InitialMessageCategory, limit = 10) {
    const conditions = [
      eq(initialMessagesTable.teamId, teamId),
      eq(initialMessagesTable.isActive, true),
    ];

    if (category) conditions.push(eq(initialMessagesTable.category, category));

    const messages = await this.db.query.initialMessages.findMany({
      where: and(...conditions),
      orderBy: [desc(initialMessagesTable.positiveResponseRate)],
      limit,
    });

    return messages.map((msg) => ({
      messageId: msg.id,
      messageName: msg.name,
      timesUsed: msg.timesUsed,
      responseRate: msg.responseRate || 0,
      positiveResponseRate: msg.positiveResponseRate || 0,
      avgResponseTime: msg.avgResponseTime,
    }));
  }

  /**
   * Update message metrics after use
   */
  async recordMessageUsage(messageId: string, hadResponse: boolean, wasPositive: boolean) {
    const message = await this.db.query.initialMessages.findFirst({
      where: eq(initialMessagesTable.id, messageId),
    });

    if (!message) return;

    const newTimesUsed = message.timesUsed + 1;
    const oldResponseCount = Math.round((message.responseRate || 0) * message.timesUsed / 100);
    const newResponseCount = oldResponseCount + (hadResponse ? 1 : 0);
    const newResponseRate = Math.round((newResponseCount / newTimesUsed) * 100);

    const oldPositiveCount = Math.round((message.positiveResponseRate || 0) * message.timesUsed / 100);
    const newPositiveCount = oldPositiveCount + (wasPositive ? 1 : 0);
    const newPositiveRate = Math.round((newPositiveCount / newTimesUsed) * 100);

    await this.db
      .update(initialMessagesTable)
      .set({
        timesUsed: newTimesUsed,
        responseRate: newResponseRate,
        positiveResponseRate: newPositiveRate,
      })
      .where(eq(initialMessagesTable.id, messageId));
  }

  /**
   * Get available personalization tokens
   */
  getPersonalizationTokens() {
    return [
      { token: "{{firstName}}", description: "Lead's first name", example: "John" },
      { token: "{{lastName}}", description: "Lead's last name", example: "Smith" },
      { token: "{{propertyAddress}}", description: "Property street address", example: "123 Main St" },
      { token: "{{city}}", description: "Property city", example: "Austin" },
      { token: "{{state}}", description: "Property state", example: "TX" },
      { token: "{{equity}}", description: "Estimated equity amount", example: "$150,000" },
      { token: "{{sdrName}}", description: "Assigned SDR name", example: "Sarah" },
    ];
  }

  /**
   * Preview personalized message
   */
  previewMessage(content: string, data: Record<string, string>) {
    let personalized = content;
    const tokensUsed: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      const token = `{{${key}}}`;
      if (content.includes(token)) {
        personalized = personalized.replace(new RegExp(token, "g"), value);
        tokensUsed.push(token);
      }
    }

    return {
      originalContent: content,
      personalizedContent: personalized,
      tokensUsed,
    };
  }
}
