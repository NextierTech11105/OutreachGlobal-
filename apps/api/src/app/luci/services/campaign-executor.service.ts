/**
 * LUCI Campaign Executor
 * Sends bulk SMS to SignalHouse with 10DLC compliance
 *
 * Uses smsPhonePool for:
 * - Phone rotation (round-robin across pool)
 * - Daily send tracking (persisted across restarts)
 * - Auto-disable failing numbers
 *
 * Campaign config from phone-campaign-map.ts
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leadsTable, smsPhonePool } from "@/database/schema-alias";
import { SignalHouseService } from "@/lib/signalhouse/signalhouse.service";
import { and, eq, desc, inArray, isNotNull, asc, sql, sum } from "drizzle-orm";

// Default rate limits (can be overridden per phone)
const DEFAULT_TPM_LIMIT = 75;
const DEFAULT_DELAY_MS = 850; // ~70/min to stay under TPM

// Phone → Campaign mapping (imported inline to avoid circular deps)
const PHONE_CAMPAIGN_MAP: Record<string, { campaignId: string; dailyLimit: number }> = {
  "15164079249": { campaignId: "CJRCU60", dailyLimit: 2000 },
};

export interface CampaignExecuteOptions {
  teamId: string;
  messageTemplate: string;
  sectorTag?: string;
  limit?: number;
  dryRun?: boolean;
}

export interface CampaignExecuteResult {
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
  cost: number;
  leadIds: string[];
}

@Injectable()
export class CampaignExecutorService {
  private readonly logger = new Logger(CampaignExecutorService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private signalhouse: SignalHouseService,
  ) {}

  /**
   * Execute bulk SMS campaign on ready leads
   * Uses phone pool rotation and tracks daily sends
   */
  async executeCampaign(
    options: CampaignExecuteOptions,
  ): Promise<CampaignExecuteResult> {
    const {
      teamId,
      messageTemplate,
      sectorTag,
      limit = 500,
      dryRun = false,
    } = options;

    this.logger.log(
      `[LUCI] Executing campaign for team ${teamId}, limit: ${limit}, dryRun: ${dryRun}`,
    );

    // Get phone pool for this team
    const poolStats = await this.getTeamPhonePoolStats(teamId);
    if (poolStats.availablePhones === 0) {
      return {
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: ["No active phones in pool for this team"],
        cost: 0,
        leadIds: [],
      };
    }

    // Calculate remaining daily capacity across all phones
    const remainingCapacity = poolStats.totalDailyLimit - poolStats.sentToday;
    if (remainingCapacity <= 0) {
      return {
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [`Daily limit reached: ${poolStats.sentToday}/${poolStats.totalDailyLimit} sent today`],
        cost: 0,
        leadIds: [],
      };
    }

    // Get ready leads - mobiles with best scores
    const conditions = [
      eq(leadsTable.teamId, teamId),
      eq(leadsTable.enrichmentStatus, "ready"),
      eq(leadsTable.smsReady, true),
      isNotNull(leadsTable.primaryPhone),
      inArray(leadsTable.phoneContactGrade, ["A", "B"]),
    ];

    if (sectorTag) {
      conditions.push(eq(leadsTable.sectorTag, sectorTag));
    }

    // Limit to remaining daily capacity
    const effectiveLimit = Math.min(limit, remainingCapacity);

    const leads = await this.db
      .select({
        id: leadsTable.id,
        leadId: leadsTable.leadId,
        firstName: leadsTable.firstName,
        lastName: leadsTable.lastName,
        company: leadsTable.company,
        phone: leadsTable.primaryPhone,
        phoneType: leadsTable.primaryPhoneType,
        phoneGrade: leadsTable.phoneContactGrade,
        activityScore: leadsTable.phoneActivityScore,
      })
      .from(leadsTable)
      .where(and(...conditions))
      .orderBy(
        desc(leadsTable.phoneActivityScore),
        leadsTable.phoneContactGrade,
      )
      .limit(effectiveLimit);

    if (leads.length === 0) {
      return {
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: ["No ready leads with mobiles found"],
        cost: 0,
        leadIds: [],
      };
    }

    // Filter to mobiles only
    const mobileLeads = leads.filter(
      (l) =>
        l.phoneType?.toLowerCase() === "mobile" ||
        l.phoneType?.toLowerCase() === "wireless",
    );

    this.logger.log(
      `[LUCI] Found ${leads.length} ready leads, ${mobileLeads.length} are mobiles`,
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];
    const sentLeadIds: string[] = [];

    // Send SMS with rate limiting and phone rotation
    for (const lead of mobileLeads) {
      if (!lead.phone) {
        skipped++;
        continue;
      }

      // Get next phone from pool (round-robin)
      const phoneInfo = await this.selectNextPhone(teamId);
      if (!phoneInfo) {
        errors.push("No available phones in pool");
        break;
      }

      // Get campaign config for this phone
      const campaignConfig = PHONE_CAMPAIGN_MAP[phoneInfo.phoneNumber] || {
        campaignId: "CJRCU60", // fallback
        dailyLimit: 2000,
      };

      // Personalize message
      const personalizedMessage = this.personalizeMessage(
        messageTemplate,
        lead,
      );

      if (dryRun) {
        this.logger.debug(
          `[DRY RUN] Would send to ${lead.phone} from ${phoneInfo.phoneNumber}: ${personalizedMessage}`,
        );
        sent++;
        sentLeadIds.push(lead.id);
        continue;
      }

      try {
        const result = await this.signalhouse.sendSms({
          to: lead.phone,
          from: phoneInfo.phoneNumber,
          message: personalizedMessage,
          campaignId: campaignConfig.campaignId,
        });

        if (result.success) {
          sent++;
          sentLeadIds.push(lead.id);

          // Record success in phone pool
          await this.recordSendResult(phoneInfo.poolEntryId, "success");

          // Mark lead as sent
          await this.db
            .update(leadsTable)
            .set({
              enrichmentStatus: "campaign",
              updatedAt: new Date(),
            })
            .where(eq(leadsTable.id, lead.id));
        } else {
          failed++;
          errors.push(`${lead.leadId}: ${result.error}`);
          await this.recordSendResult(phoneInfo.poolEntryId, "failure");
        }

        // Rate limit to stay under TPM
        await this.delay(DEFAULT_DELAY_MS);
      } catch (err) {
        failed++;
        errors.push(
          `${lead.leadId}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        if (phoneInfo) {
          await this.recordSendResult(phoneInfo.poolEntryId, "failure");
        }
      }
    }

    // Calculate cost (SignalHouse rates)
    const cost = sent * 0.015;

    this.logger.log(
      `[LUCI] Campaign complete: ${sent} sent, ${failed} failed, ${skipped} skipped`,
    );

    return {
      sent,
      failed,
      skipped,
      errors: errors.slice(0, 10),
      cost,
      leadIds: sentLeadIds,
    };
  }

  /**
   * Select next phone from pool using round-robin (LRU)
   */
  private async selectNextPhone(
    teamId: string,
  ): Promise<{ phoneNumber: string; poolEntryId: string } | null> {
    // Get next healthy, active phone (LRU order - nulls first means never-used phones get picked first)
    const [phone] = await this.db
      .select({
        id: smsPhonePool.id,
        phoneNumber: smsPhonePool.phoneNumber,
      })
      .from(smsPhonePool)
      .where(
        and(
          eq(smsPhonePool.teamId, teamId),
          eq(smsPhonePool.isActive, true),
          eq(smsPhonePool.isHealthy, true),
        ),
      )
      .orderBy(sql`${smsPhonePool.lastUsedAt} ASC NULLS FIRST`)
      .limit(1);

    if (!phone) return null;

    // Update last used and increment daily count atomically
    await this.db
      .update(smsPhonePool)
      .set({
        lastUsedAt: new Date(),
        sendCount: sql`${smsPhonePool.sendCount} + 1`,
        dailySendCount: sql`${smsPhonePool.dailySendCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(smsPhonePool.id, phone.id));

    return {
      phoneNumber: phone.phoneNumber,
      poolEntryId: phone.id,
    };
  }

  /**
   * Record send result for health tracking
   */
  private async recordSendResult(
    poolEntryId: string,
    result: "success" | "failure",
  ): Promise<void> {
    if (result === "success") {
      await this.db
        .update(smsPhonePool)
        .set({
          successCount: sql`${smsPhonePool.successCount} + 1`,
          consecutiveFailures: 0,
          updatedAt: new Date(),
        })
        .where(eq(smsPhonePool.id, poolEntryId));
    } else {
      await this.db
        .update(smsPhonePool)
        .set({
          failureCount: sql`${smsPhonePool.failureCount} + 1`,
          consecutiveFailures: sql`${smsPhonePool.consecutiveFailures} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(smsPhonePool.id, poolEntryId));

      // Auto-disable after 5 consecutive failures
      await this.db
        .update(smsPhonePool)
        .set({ isHealthy: false, lastHealthCheckAt: new Date() })
        .where(
          and(
            eq(smsPhonePool.id, poolEntryId),
            sql`${smsPhonePool.consecutiveFailures} >= 5`,
          ),
        );
    }
  }

  /**
   * Get phone pool stats for a team
   */
  private async getTeamPhonePoolStats(teamId: string): Promise<{
    availablePhones: number;
    sentToday: number;
    totalDailyLimit: number;
  }> {
    const phones = await this.db
      .select({
        phoneNumber: smsPhonePool.phoneNumber,
        dailySendCount: smsPhonePool.dailySendCount,
        isActive: smsPhonePool.isActive,
        isHealthy: smsPhonePool.isHealthy,
      })
      .from(smsPhonePool)
      .where(eq(smsPhonePool.teamId, teamId));

    const activePhones = phones.filter((p) => p.isActive && p.isHealthy);
    const sentToday = phones.reduce((sum, p) => sum + p.dailySendCount, 0);

    // Calculate total daily limit based on phone campaign configs
    let totalDailyLimit = 0;
    for (const phone of activePhones) {
      const config = PHONE_CAMPAIGN_MAP[phone.phoneNumber];
      totalDailyLimit += config?.dailyLimit || 2000;
    }

    return {
      availablePhones: activePhones.length,
      sentToday,
      totalDailyLimit: totalDailyLimit || 2000, // Default if no phones
    };
  }

  /**
   * Personalize message template with lead data
   */
  private personalizeMessage(
    template: string,
    lead: {
      firstName: string | null;
      lastName: string | null;
      company: string | null;
    },
  ): string {
    let message = template;

    // Replace placeholders
    message = message.replace(/\{firstName\}/gi, lead.firstName || "there");
    message = message.replace(/\{lastName\}/gi, lead.lastName || "");
    message = message.replace(/\{company\}/gi, lead.company || "your business");
    message = message.replace(/\{name\}/gi, lead.firstName || "there");

    // Ensure STOP message is included for compliance
    if (!message.toLowerCase().includes("stop")) {
      message += " Reply STOP to opt out.";
    }

    return message.trim();
  }

  /**
   * Get campaign execution stats
   */
  async getCampaignStats(teamId: string): Promise<{
    totalReady: number;
    totalMobiles: number;
    sentToday: number;
    remainingDaily: number;
    gradeA: number;
    gradeB: number;
    phonePoolStatus: {
      activePhones: number;
      healthyPhones: number;
      totalDailyLimit: number;
    };
  }> {
    // Get lead counts
    const [readyCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "ready"),
          eq(leadsTable.smsReady, true),
        ),
      );

    const [mobileCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "ready"),
          eq(leadsTable.smsReady, true),
          eq(leadsTable.primaryPhoneType, "mobile"),
        ),
      );

    const [gradeACount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "ready"),
          eq(leadsTable.smsReady, true),
          eq(leadsTable.phoneContactGrade, "A"),
        ),
      );

    const [gradeBCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "ready"),
          eq(leadsTable.smsReady, true),
          eq(leadsTable.phoneContactGrade, "B"),
        ),
      );

    // Get phone pool stats (actual daily sends from smsPhonePool)
    const poolStats = await this.getTeamPhonePoolStats(teamId);

    return {
      totalReady: Number(readyCount?.count) || 0,
      totalMobiles: Number(mobileCount?.count) || 0,
      sentToday: poolStats.sentToday,
      remainingDaily: poolStats.totalDailyLimit - poolStats.sentToday,
      gradeA: Number(gradeACount?.count) || 0,
      gradeB: Number(gradeBCount?.count) || 0,
      phonePoolStatus: {
        activePhones: poolStats.availablePhones,
        healthyPhones: poolStats.availablePhones,
        totalDailyLimit: poolStats.totalDailyLimit,
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
