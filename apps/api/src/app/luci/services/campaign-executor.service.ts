/**
 * LUCI Campaign Executor
 * Sends bulk SMS to SignalHouse with 10DLC compliance
 *
 * Campaign: CJRCU60 (NEXTIER)
 * Phone: 15164079249
 * Daily Cap: 2k (T-Mobile brand limit)
 * TPM: 75 SMS (AT&T)
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leadsTable } from "@/database/schema-alias";
import { SignalHouseService } from "@/lib/signalhouse/signalhouse.service";
import { and, eq, desc, inArray, isNotNull } from "drizzle-orm";

// SignalHouse 10DLC Config
const SIGNALHOUSE_CONFIG = {
  campaignId: "CJRCU60",
  fromNumber: "15164079249",
  brandName: "NEXTIER",
  dailyCap: 2000, // T-Mobile brand daily cap
  tpmLimit: 75, // AT&T throughput per minute
  delayBetweenMs: 850, // ~70/min to stay under TPM
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
   * Mobiles first, highest scores first
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
        desc(leadsTable.phoneActivityScore), // Highest score first
        leadsTable.phoneContactGrade, // Grade A before B
      )
      .limit(Math.min(limit, SIGNALHOUSE_CONFIG.dailyCap));

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

    // Send SMS with rate limiting
    for (const lead of mobileLeads) {
      if (!lead.phone) {
        skipped++;
        continue;
      }

      // Personalize message
      const personalizedMessage = this.personalizeMessage(
        messageTemplate,
        lead,
      );

      if (dryRun) {
        this.logger.debug(
          `[DRY RUN] Would send to ${lead.phone}: ${personalizedMessage}`,
        );
        sent++;
        sentLeadIds.push(lead.id);
        continue;
      }

      try {
        const result = await this.signalhouse.sendSms({
          to: lead.phone,
          from: SIGNALHOUSE_CONFIG.fromNumber,
          message: personalizedMessage,
          campaignId: SIGNALHOUSE_CONFIG.campaignId,
        });

        if (result.success) {
          sent++;
          sentLeadIds.push(lead.id);

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
        }

        // Rate limit to stay under TPM
        await this.delay(SIGNALHOUSE_CONFIG.delayBetweenMs);
      } catch (err) {
        failed++;
        errors.push(
          `${lead.leadId}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    // Calculate cost (SignalHouse rates)
    const cost = sent * 0.015; // ~$0.015 per SMS

    this.logger.log(
      `[LUCI] Campaign complete: ${sent} sent, ${failed} failed, ${skipped} skipped`,
    );

    return {
      sent,
      failed,
      skipped,
      errors: errors.slice(0, 10), // First 10 errors
      cost,
      leadIds: sentLeadIds,
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
  }> {
    const [totalReady] = await this.db
      .select({ count: leadsTable.id })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "ready"),
          eq(leadsTable.smsReady, true),
        ),
      );

    const [totalMobiles] = await this.db
      .select({ count: leadsTable.id })
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.teamId, teamId),
          eq(leadsTable.enrichmentStatus, "ready"),
          eq(leadsTable.smsReady, true),
          eq(leadsTable.primaryPhoneType, "mobile"),
        ),
      );

    // TODO: Track daily sends in a separate table
    const sentToday = 0;

    return {
      totalReady: totalReady?.count ? Number(totalReady.count) : 0,
      totalMobiles: totalMobiles?.count ? Number(totalMobiles.count) : 0,
      sentToday,
      remainingDaily: SIGNALHOUSE_CONFIG.dailyCap - sentToday,
      gradeA: 0,
      gradeB: 0,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
