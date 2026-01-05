import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import {
  CAMPAIGN_SEQUENCE_QUEUE,
  CampaignSequenceJobs,
} from "../constants/campaign-sequence.contants";
import { ProcessNextCampaignSequenceData } from "../types/campaign-sequence.type";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { and, eq } from "drizzle-orm";
import { Logger } from "@nestjs/common";
import { CampaignSequenceSelect } from "../models/campaign-sequence.model";
import { LeadSelect } from "@/app/lead/models/lead.model";
import { addDays, addHours } from "date-fns";
import {
  campaignEventsTable,
  campaignExecutionsTable,
  campaignLeadsTable,
} from "@/database/schema-alias";
import { formatTemplate, getVariables } from "@/common/utils/format-template";
import { MailService } from "@/lib/mail/mail.service";
import { TwilioService } from "@/lib/twilio/twilio.service";
import { CampaignEventName, CampaignExecutionStatus } from "@nextier/common";
import { render } from "@react-email/render";
import { CampaignEmail } from "@/emails/pages/campaign-email";
import { SendgridService } from "@/app/team/services/sendgrid.service";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import { SendgridSettings } from "@/app/team/objects/sendgrid-settings.object";
import { TwilioSettings } from "@/app/team/objects/twilio-settings.object";
import { DeadLetterQueueService } from "@/lib/dlq";
import { OutboundGateService } from "@/lib/outbound";

interface SendMessageOptions {
  sequence: CampaignSequenceSelect;
  content: string;
  subject?: string;
}

type AllSettings = TwilioSettings & SendgridSettings;

@Processor(CAMPAIGN_SEQUENCE_QUEUE, { concurrency: 5, lockDuration: 30000 })
export class CampaignSequenceConsumer extends WorkerHost {
  private readonly logger = new Logger(CampaignSequenceConsumer.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private mailService: MailService,
    private twilioService: TwilioService,
    private sendgridService: SendgridService,
    private settingService: TeamSettingService,
    private dlqService: DeadLetterQueueService,
    private outboundGate: OutboundGateService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === CampaignSequenceJobs.PROCESS_NEXT) {
      const sequence = await this.getSequenceByPosition(job.data);
      if (!sequence) {
        this.logger.log("no sequence found", job.data);
        return;
      }

      await this.executeSequence(sequence, job.data.leadId);
      await this.updateLeadProgress(
        job.data.campaignId,
        job.data.leadId,
        sequence,
      );
    }
  }

  private async executeSequence(
    sequence: CampaignSequenceSelect,
    leadId: string,
  ) {
    // OUTBOUND GATE: Check suppression BEFORE fetching lead details
    const channel = this.sequenceTypeToChannel(sequence.type);
    const gateCheck = await this.outboundGate.canContact(leadId, channel);

    if (!gateCheck.allowed) {
      this.logger.warn(
        `Sequence blocked by OutboundGate: ${gateCheck.reason} - lead ${leadId}`,
      );
      await this.db.insert(campaignExecutionsTable).values({
        campaignId: sequence.campaignId,
        sequenceId: sequence.id,
        leadId,
        status: CampaignExecutionStatus.BLOCKED,
        failedReason: `OutboundGate: ${gateCheck.reason}`,
      });
      return;
    }

    const lead = await this.db.query.leads.findFirst({
      where: (t) => eq(t.id, leadId),
    });
    if (!lead) {
      this.logger.log("lead not found", leadId);
      return;
    }

    const { status, failedReason } = await this.sendMessage(sequence, lead);
    await this.db.insert(campaignExecutionsTable).values({
      campaignId: sequence.campaignId,
      sequenceId: sequence.id,
      leadId: lead.id,
      status,
      failedReason: failedReason || null,
    });
  }

  private sequenceTypeToChannel(
    type: string,
  ): "sms" | "email" | "voice" {
    switch (type) {
      case "EMAIL":
        return "email";
      case "VOICE":
        return "voice";
      case "SMS":
      default:
        return "sms";
    }
  }

  private async sendMessage(
    sequence: CampaignSequenceSelect,
    lead: LeadSelect,
  ) {
    const settings = await this.settingService.getMapped<AllSettings>(
      lead.teamId,
    );
    const variables = getVariables({ lead });
    const content = formatTemplate(sequence.content, variables);
    switch (sequence.type) {
      case "EMAIL":
        return await this.sendEmail(
          { content, subject: sequence.subject || sequence.name, sequence },
          lead,
          settings,
        );
      case "SMS":
        return await this.sendSMS({ content, sequence }, lead, settings);
      case "VOICE":
        return await this.sendVoice({ content, sequence }, lead, settings);
      default:
        return {
          status: CampaignExecutionStatus.FAILED,
          failedReason: "unknown sequence type",
        };
    }
  }

  async sendEmail(
    { content, subject, sequence }: SendMessageOptions,
    lead: LeadSelect,
    settings: AllSettings,
  ) {
    if (!lead.email) {
      return {
        status: CampaignExecutionStatus.FAILED,
        failedReason: "no email",
      };
    }

    try {
      await this.sendgridService.send({
        apiKey: settings.sendgridApiKey,
        data: {
          to: lead.email,
          from: settings.sendgridFromEmail || "",
          subject,
          html: await render(CampaignEmail({ content, subject: subject! })),
          headers: {
            "X-SMTPAPI": JSON.stringify({
              unique_args: {
                leadId: lead.id,
                campaignId: sequence.campaignId,
                sequenceId: sequence.id,
              },
            }),
          },
        },
      });

      await this.db.insert(campaignEventsTable).values({
        leadId: lead.id,
        sequenceId: sequence.id,
        campaignId: sequence.campaignId,
        name: CampaignEventName.SENT,
      });

      return {
        status: CampaignExecutionStatus.COMPLETED,
        failedReason: undefined,
      };
    } catch (error) {
      return {
        status: CampaignExecutionStatus.FAILED,
        failedReason: "sending failed",
      };
    }
  }

  async sendSMS(
    { content }: SendMessageOptions,
    lead: LeadSelect,
    settings: AllSettings,
  ) {
    if (!lead.phone) {
      return {
        status: CampaignExecutionStatus.FAILED,
        failedReason: "no phone",
      };
    }

    try {
      await this.twilioService.sendSms({
        accountSid: settings.twilioAccountSid,
        authToken: settings.twilioAuthToken,
        from: settings.twilioDefaultPhoneNumber || "",
        to: lead.phone,
        body: content,
      });

      return {
        status: CampaignExecutionStatus.COMPLETED,
        failedReason: undefined,
      };
    } catch (error) {
      return {
        status: CampaignExecutionStatus.FAILED,
        failedReason: "sending failed",
      };
    }
  }

  async sendVoice(
    { content }: SendMessageOptions,
    lead: LeadSelect,
    settings: AllSettings,
  ) {
    if (!lead.phone) {
      return {
        status: CampaignExecutionStatus.FAILED,
        failedReason: "no phone",
      };
    }

    try {
      await this.twilioService.makeCall({
        accountSid: settings.twilioAccountSid,
        authToken: settings.twilioAuthToken,
        from: settings.twilioDefaultPhoneNumber || "",
        to: lead.phone,
        words: content,
      });

      return {
        status: CampaignExecutionStatus.COMPLETED,
        failedReason: undefined,
      };
    } catch (error) {
      return {
        status: CampaignExecutionStatus.FAILED,
        failedReason: "sending failed",
      };
    }
  }

  private getSequenceByPosition(data: ProcessNextCampaignSequenceData) {
    return this.db.query.campaignSequences.findFirst({
      where: (t) =>
        and(eq(t.campaignId, data.campaignId), eq(t.position, data.position)),
    });
  }

  private getNextSequence(campaignId: string, currentPosition: number) {
    return this.db.query.campaignSequences.findFirst({
      where: (t) =>
        and(eq(t.campaignId, campaignId), eq(t.position, currentPosition + 1)),
    });
  }

  private async updateLeadProgress(
    campaignId: string,
    leadId: string,
    currentSequence: CampaignSequenceSelect,
  ) {
    // Get the next sequence
    const nextSequence = await this.getNextSequence(
      campaignId,
      currentSequence.position,
    );
    const whereQuery = and(
      eq(campaignLeadsTable.campaignId, campaignId),
      eq(campaignLeadsTable.leadId, leadId),
    );

    if (nextSequence) {
      // Calculate next run time based on delay
      let nextRunAt = new Date();
      if (nextSequence.delayDays) {
        nextRunAt = addDays(nextRunAt, nextSequence.delayDays);
      }
      if (nextSequence.delayHours) {
        nextRunAt = addHours(nextRunAt, nextSequence.delayHours);
      }

      // Update lead progress
      await this.db
        .update(campaignLeadsTable)
        .set({
          currentSequencePosition: nextSequence.position,
          currentSequenceStatus: "PENDING",
          nextSequenceRunAt: nextRunAt,
          lastSequenceExecutedAt: new Date(),
        })
        .where(whereQuery);
    } else {
      await this.db
        .update(campaignLeadsTable)
        .set({
          currentSequenceStatus: "COMPLETED",
          status: "COMPLETED",
          lastSequenceExecutedAt: new Date(),
        })
        .where(whereQuery);
    }
  }

  @OnWorkerEvent("failed")
  async handleFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
    await this.dlqService.recordBullMQFailure(
      CAMPAIGN_SEQUENCE_QUEUE,
      job,
      error,
    );
  }
}
