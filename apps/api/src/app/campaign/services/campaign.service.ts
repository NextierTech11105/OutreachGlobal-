import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  FindOneCampaignArgs,
  CampaignConnectionArgs,
  CreateCampaignArgs,
  UpdateCampaignArgs,
  DeleteCampaignArgs,
  ToggleCampaignStatusArgs,
  ApproveCampaignArgs,
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

@Injectable()
export class CampaignService {
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

  async create({ input, teamId }: CreateCampaignArgs) {
    const estimatedLeadsCount = await this.leadService.count({
      teamId,
      minScore: input.minScore,
      maxScore: input.maxScore,
    });

    const result = await this.db.transaction(async (tx) => {
      const sessionOptions = { session: tx };
      try {
        const campaign = await this.repository.create(
          {
            ...input,
            teamId,
            estimatedLeadsCount,
            status: CampaignStatus.SCHEDULED,
            startsAt: new Date(),
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
          const campaignLeadValues: CampaignLeadInsert[] = eligibleLeads.map(
            (lead) => ({
              campaignId: campaign.id,
              leadId: lead.id,
              currentSequencePosition: 1,
              currentSequenceStatus: CampaignSequenceStatus.PENDING,
              nextSequenceRunAt: new Date(),
              status: "ACTIVE",
            }),
          );

          await tx.insert(campaignLeadsTable).values(campaignLeadValues);
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

    // APPROVAL GATE: Campaign cannot transition to ACTIVE without approval
    if (status === CampaignStatus.ACTIVE && !campaign.approvedAt) {
      throw new InternalServerErrorException(
        "Campaign requires approval before activation. Use the approve endpoint first.",
      );
    }

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

  /**
   * Approve a campaign for launch
   * HARD RULE: Campaign cannot transition to RUNNING/ACTIVE without approval
   */
  async approve(args: ApproveCampaignArgs) {
    const campaign = await this.findOneOrFail({
      id: args.id,
      teamId: args.teamId,
    });

    // Prevent re-approval
    if (campaign.approvedAt) {
      return { campaign, alreadyApproved: true };
    }

    const [updatedCampaign] = await this.db
      .update(campaignsTable)
      .set({
        approvedBy: args.approvedBy,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(campaignsTable.id, args.id),
          eq(campaignsTable.teamId, args.teamId),
        ),
      )
      .returning();

    if (!updatedCampaign) {
      throw new ModelNotFoundError("campaign not found");
    }

    return { campaign: updatedCampaign, alreadyApproved: false };
  }

  /**
   * Approve and immediately activate a campaign
   * Convenience method combining approve + toggle
   */
  async approveAndLaunch(args: ApproveCampaignArgs) {
    // First approve
    const { campaign } = await this.approve(args);

    // Then activate
    const [activatedCampaign] = await this.db
      .update(campaignsTable)
      .set({
        status: CampaignStatus.ACTIVE,
        resumedAt: new Date(),
      })
      .where(
        and(
          eq(campaignsTable.id, args.id),
          eq(campaignsTable.teamId, args.teamId),
        ),
      )
      .returning();

    return { campaign: activatedCampaign };
  }
}
