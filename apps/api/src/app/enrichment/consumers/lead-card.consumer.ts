/**
 * Lead Card Consumer
 * Processes lead card creation and update jobs
 */
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  LeadCardService,
  CreateLeadCardJob,
} from "../services/lead-card.service";
import { IdentityGraphService } from "../services/identity-graph.service";
import { CampaignTriggerService } from "../services/campaign-trigger.service";

interface UpdateFromSkipTraceJob {
  teamId: string;
  personaId: string;
  skipTraceResult: {
    phonesAdded: number;
    emailsAdded: number;
    addressesAdded: number;
    socialsAdded: number;
    demographicsUpdated: boolean;
  };
}

interface UpdateFromApolloJob {
  teamId: string;
  personaId: string;
  businessId: string;
}

interface TriggerCampaignJob {
  teamId: string;
  leadCardId: string;
  agent?: "sabrina" | "gianna";
  channel?: "sms" | "email";
}

@Processor("lead-card")
export class LeadCardConsumer extends WorkerHost {
  private readonly logger = new Logger(LeadCardConsumer.name);

  constructor(
    private leadCardService: LeadCardService,
    private identityGraphService: IdentityGraphService,
    private campaignTriggerService: CampaignTriggerService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing lead-card job ${job.id}: ${job.name}`);

    switch (job.name) {
      case "CREATE_LEAD_CARD":
        return this.createLeadCard(job.data);

      case "UPDATE_FROM_SKIPTRACE":
        return this.updateFromSkipTrace(job.data);

      case "UPDATE_FROM_APOLLO":
        return this.updateFromApollo(job.data);

      case "RUN_IDENTITY_MATCH":
        return this.runIdentityMatch(job.data);

      case "TRIGGER_CAMPAIGN":
        return this.triggerCampaign(job.data);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Create new lead card
   */
  private async createLeadCard(data: CreateLeadCardJob) {
    const leadCardId = await this.leadCardService.createOrUpdateLeadCard(data);
    return { leadCardId };
  }

  /**
   * Update lead card after SkipTrace enrichment
   */
  private async updateFromSkipTrace(data: UpdateFromSkipTraceJob) {
    const { teamId, personaId, skipTraceResult } = data;

    // Only run identity match if significant data was added
    const significantData =
      skipTraceResult.phonesAdded > 0 || skipTraceResult.emailsAdded > 0;

    if (significantData) {
      // Try to merge with existing personas
      const mergeResult = await this.identityGraphService.autoMergePersona(
        teamId,
        personaId,
      );

      if (mergeResult && mergeResult.mergedIds.length > 0) {
        this.logger.log(
          `Merged ${mergeResult.mergedIds.length} personas after SkipTrace`,
        );
      }
    }

    // Update/create lead card
    const leadCardId = await this.leadCardService.createOrUpdateLeadCard({
      teamId,
      personaId,
    });

    return { leadCardId, mergedCount: 0 };
  }

  /**
   * Update lead card after Apollo enrichment
   */
  private async updateFromApollo(data: UpdateFromApolloJob) {
    const { teamId, personaId, businessId } = data;

    // Try to merge with existing personas
    const mergeResult = await this.identityGraphService.autoMergePersona(
      teamId,
      personaId,
    );

    // Update/create lead card
    const leadCardId = await this.leadCardService.createOrUpdateLeadCard({
      teamId,
      personaId,
      businessId,
    });

    return {
      leadCardId,
      mergedCount: mergeResult?.mergedIds.length || 0,
    };
  }

  /**
   * Run identity matching for a persona
   */
  private async runIdentityMatch(data: { teamId: string; personaId: string }) {
    const { teamId, personaId } = data;

    const matches = await this.identityGraphService.findPotentialMatches(
      teamId,
      personaId,
    );

    // Auto-merge high confidence matches
    const mergeResult = await this.identityGraphService.autoMergePersona(
      teamId,
      personaId,
    );

    return {
      potentialMatches: matches.length,
      autoMerged: mergeResult?.mergedIds.length || 0,
    };
  }

  /**
   * Trigger campaign for a lead card
   */
  private async triggerCampaign(data: TriggerCampaignJob) {
    const { teamId, leadCardId, agent, channel } = data;

    const queueId = await this.campaignTriggerService.queueForCampaign({
      teamId,
      leadCardId,
      agent: agent || "sabrina",
      channel: channel || "sms",
    });

    return { queueId };
  }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job) {
    this.logger.log(`Lead card job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Lead card job ${job.id} failed: ${error.message}`,
      error.stack,
    );
  }
}
