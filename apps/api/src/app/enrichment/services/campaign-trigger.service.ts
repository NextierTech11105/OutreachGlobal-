/**
 * Campaign Trigger Service
 * Queues leads for SMS/Email campaigns via Sabrina or Gianna
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { generateUlid } from "@/database/columns/ulid";
import { eq, and, lte, or, isNull, desc, asc } from "drizzle-orm";
import { unifiedLeadCards, campaignQueue, leadActivities } from "@/database/schema";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export interface TriggerCampaignJob {
  teamId: string;
  leadCardId: string;
  agent: "sabrina" | "gianna";
  channel: "sms" | "email";
  priority?: number;
  templateId?: string;
  templateOverride?: string;
  scheduledAt?: Date;
}

export interface CampaignQueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  sabrinaPending: number;
  giannaPending: number;
}

@Injectable()
export class CampaignTriggerService {
  private readonly logger = new Logger(CampaignTriggerService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    @InjectQueue("lead-card") private leadCardQueue: Queue,
  ) {}

  /**
   * Queue a lead for campaign outreach
   */
  async queueForCampaign(job: TriggerCampaignJob): Promise<string> {
    const { teamId, leadCardId, agent, channel, priority = 50, templateId, templateOverride, scheduledAt } = job;

    this.logger.log(`Queuing lead ${leadCardId} for ${agent} via ${channel}`);

    // Get lead card
    const leadCard = await this.db.query.unifiedLeadCards.findFirst({
      where: (t, { eq }) => eq(t.id, leadCardId),
    });

    if (!leadCard) {
      throw new Error(`Lead card ${leadCardId} not found`);
    }

    // Check if already queued
    const existing = await this.db.query.campaignQueue.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.leadCardId, leadCardId),
          eq(t.status, "pending")
        ),
    });

    if (existing) {
      this.logger.warn(`Lead ${leadCardId} already queued`);
      return existing.id;
    }

    // Create queue entry
    const queueId = generateUlid("cq");
    await this.db.insert(campaignQueue).values({
      id: queueId,
      teamId,
      leadCardId,
      agent,
      channel,
      priority,
      templateId,
      templateOverride,
      scheduledAt,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
    });

    // Update lead card status
    await this.db
      .update(unifiedLeadCards)
      .set({
        status: "ready",
        enrichmentStatus: "completed",
      })
      .where(eq(unifiedLeadCards.id, leadCardId));

    this.logger.log(`Queued ${queueId} for ${agent}/${channel}`);
    return queueId;
  }

  /**
   * Get next batch of campaigns ready to send
   */
  async getNextBatch(
    agent: "sabrina" | "gianna",
    channel: "sms" | "email",
    limit = 10
  ): Promise<Array<{
    queueId: string;
    leadCardId: string;
    templateId?: string;
    templateOverride?: string;
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }>> {
    const now = new Date();

    // Get pending items ready to process
    const items = await this.db.query.campaignQueue.findMany({
      where: (t, { eq, and, lte, or, isNull }) =>
        and(
          eq(t.agent, agent),
          eq(t.channel, channel),
          eq(t.status, "pending"),
          or(isNull(t.scheduledAt), lte(t.scheduledAt, now)),
          or(isNull(t.processAfter), lte(t.processAfter, now))
        ),
      orderBy: (t) => [desc(t.priority), asc(t.createdAt)],
      limit,
    });

    // Get lead card details
    const results: Array<{
      queueId: string;
      leadCardId: string;
      templateId?: string;
      templateOverride?: string;
      phone?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    }> = [];
    for (const item of items) {
      const leadCard = await this.db.query.unifiedLeadCards.findFirst({
        where: (t, { eq }) => eq(t.id, item.leadCardId),
      });

      if (leadCard) {
        results.push({
          queueId: item.id,
          leadCardId: item.leadCardId,
          templateId: item.templateId || undefined,
          templateOverride: item.templateOverride || undefined,
          phone: leadCard.primaryPhone || undefined,
          email: leadCard.primaryEmail || undefined,
          firstName: leadCard.firstName,
          lastName: leadCard.lastName,
        });
      }
    }

    return results;
  }

  /**
   * Mark campaign item as processing
   */
  async markProcessing(queueId: string): Promise<void> {
    await this.db
      .update(campaignQueue)
      .set({
        status: "processing",
        lastAttemptAt: new Date(),
        attempts: 1,
      })
      .where(eq(campaignQueue.id, queueId));
  }

  /**
   * Mark campaign item as sent
   */
  async markSent(
    queueId: string,
    externalId: string
  ): Promise<void> {
    const item = await this.db.query.campaignQueue.findFirst({
      where: (t, { eq }) => eq(t.id, queueId),
    });

    if (!item) return;

    await this.db
      .update(campaignQueue)
      .set({
        status: "sent",
        sentAt: new Date(),
        externalId,
      })
      .where(eq(campaignQueue.id, queueId));

    // Update lead card
    await this.db
      .update(unifiedLeadCards)
      .set({
        status: "contacted",
        lastContactedAt: new Date(),
        contactAttempts: 1,
      })
      .where(eq(unifiedLeadCards.id, item.leadCardId));

    // Log activity
    await this.db.insert(leadActivities).values({
      id: generateUlid("lact"),
      teamId: item.teamId,
      leadCardId: item.leadCardId,
      activityType: item.channel === "sms" ? "sms_sent" : "email_sent",
      agent: item.agent,
      channel: item.channel,
      externalId,
    });
  }

  /**
   * Mark campaign item as failed
   */
  async markFailed(
    queueId: string,
    error: string
  ): Promise<void> {
    const item = await this.db.query.campaignQueue.findFirst({
      where: (t, { eq }) => eq(t.id, queueId),
    });

    if (!item) return;

    const newAttempts = (item.attempts || 0) + 1;
    const shouldRetry = newAttempts < (item.maxAttempts || 3);

    if (shouldRetry) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, newAttempts) * 60 * 1000; // 2min, 4min, 8min
      const processAfter = new Date(Date.now() + retryDelay);

      await this.db
        .update(campaignQueue)
        .set({
          status: "pending",
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          lastError: error,
          processAfter,
        })
        .where(eq(campaignQueue.id, queueId));
    } else {
      await this.db
        .update(campaignQueue)
        .set({
          status: "failed",
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          lastError: error,
        })
        .where(eq(campaignQueue.id, queueId));
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(teamId: string): Promise<CampaignQueueStats> {
    const items = await this.db.query.campaignQueue.findMany({
      where: (t, { eq }) => eq(t.teamId, teamId),
    });

    return {
      pending: items.filter((i) => i.status === "pending").length,
      processing: items.filter((i) => i.status === "processing").length,
      sent: items.filter((i) => i.status === "sent").length,
      failed: items.filter((i) => i.status === "failed").length,
      sabrinaPending: items.filter((i) => i.status === "pending" && i.agent === "sabrina").length,
      giannaPending: items.filter((i) => i.status === "pending" && i.agent === "gianna").length,
    };
  }

  /**
   * Bulk queue leads for campaign
   */
  async bulkQueueForCampaign(
    teamId: string,
    leadCardIds: string[],
    options: {
      agent?: "sabrina" | "gianna";
      channel?: "sms" | "email";
      templateId?: string;
    } = {}
  ): Promise<{ queued: number; skipped: number }> {
    let queued = 0;
    let skipped = 0;

    for (const leadCardId of leadCardIds) {
      try {
        const leadCard = await this.db.query.unifiedLeadCards.findFirst({
          where: (t, { eq }) => eq(t.id, leadCardId),
        });

        if (!leadCard) {
          skipped++;
          continue;
        }

        // Use lead card assignment or provided options
        const agent = options.agent || (leadCard.assignedAgent as "sabrina" | "gianna") || "gianna";
        const channel = options.channel || (leadCard.assignedChannel as "sms" | "email") || "email";

        await this.queueForCampaign({
          teamId,
          leadCardId,
          agent,
          channel,
          templateId: options.templateId,
        });

        queued++;
      } catch (error) {
        this.logger.error(`Failed to queue ${leadCardId}:`, error);
        skipped++;
      }
    }

    this.logger.log(`Bulk queue complete: ${queued} queued, ${skipped} skipped`);
    return { queued, skipped };
  }
}
