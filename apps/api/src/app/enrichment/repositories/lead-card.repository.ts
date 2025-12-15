/**
 * Lead Card Repository
 * Database operations for unified lead cards
 */
import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  eq,
  and,
  or,
  desc,
  asc,
  gte,
  lte,
  like,
  inArray,
  sql,
} from "drizzle-orm";
import {
  unifiedLeadCards,
  leadActivities,
  campaignQueue,
} from "@/database/schema";
import { generateUlid } from "@/database/columns/ulid";

export interface LeadCardQuery {
  teamId: string;
  status?: string[];
  agent?: string;
  channel?: string;
  priority?: string;
  minScore?: number;
  maxScore?: number;
  roleTypes?: string[];
  isDecisionMaker?: boolean;
  enrichmentStatus?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  orderBy?: "score" | "createdAt" | "lastActivityAt";
  orderDir?: "asc" | "desc";
}

export interface LeadCardStats {
  total: number;
  byStatus: Record<string, number>;
  byAgent: Record<string, number>;
  byPriority: Record<string, number>;
  byEnrichmentStatus: Record<string, number>;
  avgScore: number;
  decisionMakers: number;
}

@Injectable()
export class LeadCardRepository {
  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Find by ID
   */
  async findById(
    id: string,
  ): Promise<typeof unifiedLeadCards.$inferSelect | null> {
    const result = await this.db.query.unifiedLeadCards.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
    return result || null;
  }

  /**
   * Find by persona ID
   */
  async findByPersonaId(
    teamId: string,
    personaId: string,
  ): Promise<typeof unifiedLeadCards.$inferSelect | null> {
    const result = await this.db.query.unifiedLeadCards.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.personaId, personaId)),
    });
    return result || null;
  }

  /**
   * Query lead cards with filters
   */
  async query(
    query: LeadCardQuery,
  ): Promise<Array<typeof unifiedLeadCards.$inferSelect>> {
    const conditions = [eq(unifiedLeadCards.teamId, query.teamId)];

    if (query.status && query.status.length > 0) {
      conditions.push(inArray(unifiedLeadCards.status, query.status));
    }

    if (query.agent) {
      conditions.push(eq(unifiedLeadCards.assignedAgent, query.agent));
    }

    if (query.channel) {
      conditions.push(eq(unifiedLeadCards.assignedChannel, query.channel));
    }

    if (query.priority) {
      conditions.push(eq(unifiedLeadCards.assignedPriority, query.priority));
    }

    if (query.minScore !== undefined) {
      conditions.push(gte(unifiedLeadCards.totalScore, query.minScore));
    }

    if (query.maxScore !== undefined) {
      conditions.push(lte(unifiedLeadCards.totalScore, query.maxScore));
    }

    if (query.roleTypes && query.roleTypes.length > 0) {
      conditions.push(inArray(unifiedLeadCards.roleType, query.roleTypes));
    }

    if (query.isDecisionMaker !== undefined) {
      conditions.push(
        eq(unifiedLeadCards.isDecisionMaker, query.isDecisionMaker),
      );
    }

    if (query.enrichmentStatus) {
      conditions.push(
        eq(unifiedLeadCards.enrichmentStatus, query.enrichmentStatus),
      );
    }

    if (query.searchQuery) {
      conditions.push(
        or(
          like(unifiedLeadCards.fullName, `%${query.searchQuery}%`),
          like(unifiedLeadCards.primaryEmail, `%${query.searchQuery}%`),
          like(unifiedLeadCards.primaryPhone, `%${query.searchQuery}%`),
        )!,
      );
    }

    // Build order
    let orderColumn;
    switch (query.orderBy) {
      case "score":
        orderColumn = unifiedLeadCards.totalScore;
        break;
      case "lastActivityAt":
        orderColumn = unifiedLeadCards.lastActivityAt;
        break;
      default:
        orderColumn = unifiedLeadCards.createdAt;
    }

    const order =
      query.orderDir === "asc" ? asc(orderColumn) : desc(orderColumn);

    const results = await this.db.query.unifiedLeadCards.findMany({
      where: and(...conditions),
      orderBy: () => [order],
      limit: query.limit || 100,
      offset: query.offset || 0,
    });

    return results;
  }

  /**
   * Get lead card statistics
   */
  async getStats(teamId: string): Promise<LeadCardStats> {
    const all = await this.db.query.unifiedLeadCards.findMany({
      where: (t, { eq }) => eq(t.teamId, teamId),
    });

    const total = all.length;

    const byStatus: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byEnrichmentStatus: Record<string, number> = {};

    let totalScore = 0;
    let decisionMakers = 0;

    for (const card of all) {
      byStatus[card.status] = (byStatus[card.status] || 0) + 1;

      if (card.assignedAgent) {
        byAgent[card.assignedAgent] = (byAgent[card.assignedAgent] || 0) + 1;
      }

      if (card.assignedPriority) {
        byPriority[card.assignedPriority] =
          (byPriority[card.assignedPriority] || 0) + 1;
      }

      byEnrichmentStatus[card.enrichmentStatus] =
        (byEnrichmentStatus[card.enrichmentStatus] || 0) + 1;

      totalScore += card.totalScore;

      if (card.isDecisionMaker) {
        decisionMakers++;
      }
    }

    return {
      total,
      byStatus,
      byAgent,
      byPriority,
      byEnrichmentStatus,
      avgScore: total > 0 ? Math.round(totalScore / total) : 0,
      decisionMakers,
    };
  }

  /**
   * Get top leads by score
   */
  async getTopLeads(
    teamId: string,
    limit = 10,
    options: { agent?: string; status?: string } = {},
  ): Promise<Array<typeof unifiedLeadCards.$inferSelect>> {
    const conditions = [eq(unifiedLeadCards.teamId, teamId)];

    if (options.agent) {
      conditions.push(eq(unifiedLeadCards.assignedAgent, options.agent));
    }

    if (options.status) {
      conditions.push(eq(unifiedLeadCards.status, options.status));
    }

    const results = await this.db.query.unifiedLeadCards.findMany({
      where: and(...conditions),
      orderBy: (t) => [desc(t.totalScore)],
      limit,
    });

    return results;
  }

  /**
   * Get leads ready for campaign
   */
  async getReadyForCampaign(
    teamId: string,
    agent: "sabrina" | "gianna",
    limit = 50,
  ): Promise<Array<typeof unifiedLeadCards.$inferSelect>> {
    const results = await this.db.query.unifiedLeadCards.findMany({
      where: (t, { eq, and, or }) =>
        and(
          eq(t.teamId, teamId),
          eq(t.assignedAgent, agent),
          or(eq(t.status, "new"), eq(t.status, "ready")),
        ),
      orderBy: (t) => [desc(t.totalScore), asc(t.createdAt)],
      limit,
    });

    return results;
  }

  /**
   * Update lead card status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(unifiedLeadCards)
      .set({
        status,
        statusChangedAt: new Date(),
      })
      .where(eq(unifiedLeadCards.id, id));
  }

  /**
   * Get activity history for a lead
   */
  async getActivities(
    leadCardId: string,
    limit = 50,
  ): Promise<Array<typeof leadActivities.$inferSelect>> {
    const results = await this.db.query.leadActivities.findMany({
      where: (t, { eq }) => eq(t.leadCardId, leadCardId),
      orderBy: (t) => [desc(t.createdAt)],
      limit,
    });

    return results;
  }

  /**
   * Get campaign queue status for a lead
   */
  async getCampaignQueueStatus(
    leadCardId: string,
  ): Promise<Array<typeof campaignQueue.$inferSelect>> {
    const results = await this.db.query.campaignQueue.findMany({
      where: (t, { eq }) => eq(t.leadCardId, leadCardId),
      orderBy: (t) => [desc(t.createdAt)],
    });

    return results;
  }
}
