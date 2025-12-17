import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { CAMPAIGN_QUEUE, CampaignJobs } from "../constants/campaign.contants";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { Job } from "bullmq";
import { and, between, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { SyncLeadCampaign } from "../commands/sync-lead-campaign";
import { CampaignSequenceStatus, CampaignStatus } from "@nextier/common";
import { campaignLeadsTable, campaignsTable } from "@/database/schema-alias";
import { CampaignLeadInsert } from "../models/campaign-lead.model";
import { CampaignService } from "../services/campaign.service";

@Processor(CAMPAIGN_QUEUE)
export class CampaignConsumer extends WorkerHost {
  constructor(@InjectDB() private db: DrizzleClient) {
    super();
  }

  async process(job: Job) {
    if (job.name === CampaignJobs.SYNC_LEAD_CAMPAIGN) {
      console.log("syncing lead", job.data);
      await this.syncLead(job.data);
    }
  }

  async syncLead(data: SyncLeadCampaign) {
    const lead = await this.db.query.leads.findFirst({
      where: (t) => eq(t.id, data.leadId),
    });

    if (lead) {
      const expression = and(
        between(
          sql.raw(`${data.score}`),
          campaignsTable.minScore,
          campaignsTable.maxScore,
        ),
        eq(campaignsTable.status, CampaignStatus.ACTIVE),
      );
      const campaigns = await this.db.query.campaigns.findMany({
        where: expression,
      });

      console.log(`found campaign ${campaigns.length}`);

      if (campaigns.length) {
        const campaignLeadValues: CampaignLeadInsert[] = [];
        for (const campaign of campaigns) {
          campaignLeadValues.push({
            campaignId: campaign.id,
            leadId: lead.id,
            currentSequencePosition: 1,
            currentSequenceStatus: CampaignSequenceStatus.PENDING,
            nextSequenceRunAt: new Date(),
            status: "ACTIVE",
          });
        }

        await this.db
          .insert(campaignLeadsTable)
          .values(campaignLeadValues)
          .onConflictDoNothing();

        if (campaignLeadValues.length) {
          const leadCounts = this.db.$with("lead_counts_sq").as(
            this.db
              .select({
                total: count(campaignLeadsTable.leadId).as("total"),
                campaignId: campaignLeadsTable.campaignId,
              })
              .from(campaignLeadsTable)
              .where(
                inArray(
                  campaignLeadsTable.campaignId,
                  campaigns.map((c) => c.id),
                ),
              )
              .groupBy(campaignLeadsTable.campaignId),
          );

          // eslint-disable-next-line drizzle/enforce-update-with-where
          await this.db
            .with(leadCounts)
            .update(campaignsTable)
            .set({
              estimatedLeadsCount: sql`${leadCounts.total}`,
            })
            .from(leadCounts)
            .where(eq(campaignsTable.id, leadCounts.campaignId));
        }
      }
    }
  }

  @OnWorkerEvent("failed")
  handleFailed(job: Job, error: any) {
    console.log("job failed", job, error);
  }
}
