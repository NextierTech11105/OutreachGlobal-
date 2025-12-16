/**
 * SkipTrace Consumer
 * Processes skip trace enrichment jobs with credit checking
 */
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  SkipTraceService,
  SkipTraceEnrichmentJob,
} from "../services/skiptrace.service";
import { CreditService } from "@/app/billing/services/credit.service";

// Credit cost per skip trace
const SKIPTRACE_CREDIT_COST = 1;

@Processor("skiptrace")
export class SkipTraceConsumer extends WorkerHost {
  private readonly logger = new Logger(SkipTraceConsumer.name);

  constructor(
    private skipTraceService: SkipTraceService,
    private creditService: CreditService,
  ) {
    super();
  }

  async process(job: Job<SkipTraceEnrichmentJob>): Promise<any> {
    this.logger.log(`Processing SkipTrace job ${job.id}: ${job.name}`);

    switch (job.name) {
      case "ENRICH_PERSONA":
        return this.enrichPersona(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Process single persona enrichment with credit check
   */
  private async enrichPersona(data: SkipTraceEnrichmentJob) {
    const { teamId, personaId } = data;

    // Check if team is using BYOK (Bring Your Own Keys)
    const isByok = await this.creditService.isUsingByok(teamId);

    if (!isByok) {
      // Check and deduct credits
      const hasCredits = await this.creditService.hasCredits(
        teamId,
        "enrichment",
        SKIPTRACE_CREDIT_COST,
      );

      if (!hasCredits) {
        const balance = await this.creditService.getBalance(teamId, "enrichment");
        this.logger.warn(
          `Team ${teamId} has insufficient enrichment credits (${balance}/${SKIPTRACE_CREDIT_COST}) for SkipTrace`,
        );
        return {
          success: false,
          personaId,
          error: "INSUFFICIENT_CREDITS",
          phonesAdded: 0,
          emailsAdded: 0,
          addressesAdded: 0,
          socialsAdded: 0,
          demographicsUpdated: false,
        };
      }

      // Deduct credits before processing
      await this.creditService.deductCredits({
        teamId,
        creditType: "enrichment",
        amount: SKIPTRACE_CREDIT_COST,
        referenceType: "skiptrace",
        referenceId: personaId,
        description: `SkipTrace enrichment for persona ${personaId}`,
      });
    }

    // Perform the actual enrichment
    const result = await this.skipTraceService.enrichPersona(data);

    // Track usage for analytics
    if (!isByok) {
      await this.creditService.trackUsage({
        teamId,
        service: "realestateapi",
        endpoint: "skiptrace",
        creditsUsed: SKIPTRACE_CREDIT_COST,
        success: result.success,
        errorMessage: result.error,
        metadata: {
          personaId,
          phonesAdded: result.phonesAdded,
          emailsAdded: result.emailsAdded,
          addressesAdded: result.addressesAdded,
        },
      });
    }

    if (!result.success) {
      // Refund credits if enrichment failed (unless it was a data issue)
      if (!isByok && result.error !== "NO_MATCH") {
        await this.creditService.addCredits({
          teamId,
          creditType: "enrichment",
          amount: SKIPTRACE_CREDIT_COST,
          transactionType: "refund",
          description: `Refund for failed SkipTrace on persona ${personaId}`,
        });
      }
      // Throw to trigger retry
      throw new Error(result.error || "SkipTrace enrichment failed");
    }

    return result;
  }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job) {
    this.logger.log(`SkipTrace job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `SkipTrace job ${job.id} failed: ${error.message}`,
      error.stack,
    );
  }
}
