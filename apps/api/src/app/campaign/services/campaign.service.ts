import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import {
  FindOneCampaignArgs,
  CampaignConnectionArgs,
  CreateCampaignArgs,
  UpdateCampaignArgs,
  DeleteCampaignArgs,
  ToggleCampaignStatusArgs,
} from "../args/campaign.args";
import { CampaignRepository } from "../repositories/campaign.repository";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { getCursorOrder, tryRollback } from "@haorama/drizzle-postgres-extra";
import { ModelNotFoundError, orFail } from "@/database/exceptions";
import { DatabaseService } from "@/database/services/database.service";
import {
  CampaignSequenceInsert,
  CampaignSequenceUpdate,
} from "../models/campaign-sequence.model";
import {
  campaignLeadsTable,
  campaignSequencesTable,
  campaignsTable,
} from "@/database/schema-alias";
import { and, eq, gte, lte } from "drizzle-orm";
import { LeadService } from "@/app/lead/services/lead.service";
import { CampaignLeadInsert } from "../models/campaign-lead.model";
import { CampaignSequenceStatus, CampaignStatus } from "@nextier/common";

/**
 * Campaign batching constants to prevent carrier blocking
 * Block rules: 1K min, 2K max per day
 */
const MIN_BATCH_SIZE = 1000;
const MAX_BATCH_SIZE = 2000;
const BATCH_DELAY_DAYS = 1; // Days between batches

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private repository: CampaignRepository,
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
    private leadService: LeadService,
  ) {}

  paginate(options: CampaignConnectionArgs) {
    const query = this.repository.findMany(options).$dynamic();
    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async findOneOrFail(options: FindOneCampaignArgs) {
    const campaign = await this.repository
      .findById(options)
      .then(orFail("campaign"));
    return campaign;
  }

  async reestimateLeadsCount(options: FindOneCampaignArgs) {
    const campaign = await this.findOneOrFail(options);
    const estimatedLeadsCount = await this.leadService.count({
      teamId: campaign.teamId,
      minScore: campaign.minScore,
      maxScore: campaign.maxScore,
    });
    await this.repository.update({ id: campaign.id }, { estimatedLeadsCount });
    return campaign;
  }

  /**
   * Helper to split an array into chunks of specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate the scheduled run date for a batch
   * First batch runs immediately, subsequent batches are staggered by BATCH_DELAY_DAYS
   */
  private getBatchScheduledDate(batchIndex: number, startDate: Date): Date {
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(scheduledDate.getDate() + batchIndex * BATCH_DELAY_DAYS);
    return scheduledDate;
  }

  async create({ input, teamId }: CreateCampaignArgs) {
    const estimatedLeadsCount = await this.leadService.count({
      teamId,
      minScore: input.minScore,
      maxScore: input.maxScore,
    });

    const result = await this.db.transaction(async (tx) => {
      const sessionOptions = { session: tx };
      try {
        const startsAt = new Date();
        const campaign = await this.repository.create(
          {
            ...input,
            teamId,
            estimatedLeadsCount,
            status: CampaignStatus.SCHEDULED,
            startsAt,
          },
          sessionOptions,
        );

        const sequenceValues: CampaignSequenceInsert[] = input.sequences.map(
          (sequence, index) => ({
            ...sequence,
            id: undefined,
            campaignId: campaign.id,
          }),
        );

        await tx.insert(campaignSequencesTable).values(sequenceValues);

        const eligibleLeads = await tx.query.leads.findMany({
          where: (t) =>
            and(
              eq(t.teamId, teamId),
              gte(t.score, input.minScore),
              lte(t.score, input.maxScore),
            ),
        });

        if (eligibleLeads.length) {
          // Split leads into batches to prevent carrier blocking
          // Block rules: 1K min, 2K max per day
          const leadBatches = this.chunkArray(eligibleLeads, MAX_BATCH_SIZE);
          const totalBatches = leadBatches.length;

          if (totalBatches > 1) {
            this.logger.log(
              `Campaign ${campaign.id}: Splitting ${eligibleLeads.length} leads into ${totalBatches} batches of max ${MAX_BATCH_SIZE}`,
            );
          }

          // Process each batch with staggered scheduling
          for (let batchIndex = 0; batchIndex < leadBatches.length; batchIndex++) {
            const batch = leadBatches[batchIndex];
            const batchScheduledDate = this.getBatchScheduledDate(batchIndex, startsAt);

            const campaignLeadValues: CampaignLeadInsert[] = batch.map(
              (lead) => ({
                campaignId: campaign.id,
                leadId: lead.id,
                currentSequencePosition: 1,
                currentSequenceStatus: CampaignSequenceStatus.PENDING,
                nextSequenceRunAt: batchScheduledDate,
                status: "ACTIVE",
              }),
            );

            await tx.insert(campaignLeadsTable).values(campaignLeadValues);

            if (totalBatches > 1) {
              this.logger.log(
                `Campaign ${campaign.id}: Batch ${batchIndex + 1}/${totalBatches} (${batch.length} leads) scheduled for ${batchScheduledDate.toISOString()}`,
              );
            }
          }
        }

        return { campaign };
      } catch (error) {
        tryRollback(tx);
        throw new InternalServerErrorException(error);
      }
    });

    return result;
  }

  async update({ input, id, teamId }: UpdateCampaignArgs) {
    const estimatedLeadsCount = await this.leadService.count({
      teamId,
      minScore: input.minScore,
      maxScore: input.maxScore,
    });

    const result = await this.db.transaction(async (tx) => {
      const sessionOptions = { session: tx };
      try {
        const campaign = await this.repository.update(
          { id, teamId },
          {
            ...input,
            estimatedLeadsCount,
          },
          sessionOptions,
        );

        const forCreate: CampaignSequenceInsert[] = [];
        const forUpdate: CampaignSequenceUpdate[] = [];

        input.sequences.forEach((seq) => {
          if (!seq.id) {
            forCreate.push({
              ...seq,
              id: undefined,
              campaignId: campaign.id,
            });
          } else {
            forUpdate.push({
              ...seq,
              id: seq.id as string,
            });
          }
        });

        if (forCreate.length) {
          await tx.insert(campaignSequencesTable).values(forCreate);
        }

        if (forUpdate.length) {
          for (const seq of forUpdate) {
            await tx
              .update(campaignSequencesTable)
              .set(seq)
              .where(eq(campaignSequencesTable.id, seq.id as string));
          }
        }

        return { campaign };
      } catch (error) {
        tryRollback(tx);
        throw new InternalServerErrorException(error);
      }
    });

    return result;
  }

  async remove(options: DeleteCampaignArgs) {
    const campaign = await this.repository.remove(options);
    if (!campaign) {
      throw new ModelNotFoundError("campaign");
    }
    return {
      deletedCampaignId: campaign.id,
    };
  }

  async toggle(filter: ToggleCampaignStatusArgs) {
    const campaign = await this.findOneOrFail(filter);
    const status =
      campaign.status === CampaignStatus.ACTIVE
        ? CampaignStatus.PAUSED
        : CampaignStatus.ACTIVE;

    const [updatedCampaign] = await this.db
      .update(campaignsTable)
      .set({
        status,
        pausedAt: status === CampaignStatus.PAUSED ? new Date() : undefined,
        resumedAt: status === CampaignStatus.ACTIVE ? new Date() : undefined,
      })
      .where(
        and(
          eq(campaignsTable.id, filter.id),
          eq(campaignsTable.teamId, filter.teamId),
        ),
      )
      .returning();

    if (!updatedCampaign) {
      throw new ModelNotFoundError("campaign not found");
    }
    return { campaign: updatedCampaign };
  }
}
