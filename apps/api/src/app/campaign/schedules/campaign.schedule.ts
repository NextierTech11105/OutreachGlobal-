import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  CAMPAIGN_SEQUENCE_QUEUE,
  CampaignSequenceJobs,
} from "../constants/campaign-sequence.contants";
import { Queue } from "bullmq";
import { and, eq, lte } from "drizzle-orm";
import { CampaignSequenceStatus, CampaignStatus } from "@nextier/common";
import { campaignLeadsTable, campaignsTable } from "@/database/schema-alias";
import { ProcessNextCampaignSequenceData } from "../types/campaign-sequence.type";

@Injectable()
export class CampaignSchedule {
  private readonly logger = new Logger(CampaignSchedule.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    @InjectQueue(CAMPAIGN_SEQUENCE_QUEUE) private queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleSequences() {
    const campaignLeads = await this.db
      .select({
        leadId: campaignLeadsTable.leadId,
        campaignId: campaignLeadsTable.campaignId,
        currentSequencePosition: campaignLeadsTable.currentSequencePosition,
        nextSequenceRunAt: campaignLeadsTable.nextSequenceRunAt,
      })
      .from(campaignLeadsTable)
      .leftJoin(
        campaignsTable,
        eq(campaignLeadsTable.campaignId, campaignsTable.id),
      )
      .where(
        and(
          eq(campaignsTable.status, CampaignStatus.ACTIVE),
          eq(campaignLeadsTable.status, "ACTIVE"),
          eq(
            campaignLeadsTable.currentSequenceStatus,
            CampaignSequenceStatus.PENDING,
          ),
          lte(campaignLeadsTable.nextSequenceRunAt, new Date()),
        ),
      )
      .limit(100);

    for (const campaignLead of campaignLeads) {
      const jobId = `${campaignLead.campaignId}-${campaignLead.leadId}-${campaignLead.currentSequencePosition}`;
      const data: ProcessNextCampaignSequenceData = {
        campaignId: campaignLead.campaignId,
        leadId: campaignLead.leadId,
        position: campaignLead.currentSequencePosition,
      };
      this.logger.debug(`Executing queue job: ${jobId}`);
      await this.queue.add(CampaignSequenceJobs.PROCESS_NEXT, data, {
        deduplication: {
          id: jobId,
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCampaignSchedules() {
    const query = and(
      eq(campaignsTable.status, CampaignStatus.SCHEDULED),
      lte(campaignsTable.startsAt, new Date()),
    );

    const count = await this.db.$count(campaignsTable, query);
    if (count > 0) {
      await this.db
        .update(campaignsTable)
        .set({ status: CampaignStatus.ACTIVE })
        .where(query);
    }
  }
}
