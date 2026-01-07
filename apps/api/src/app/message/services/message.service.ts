import { InjectDB } from "@/database/decorators";
import { DatabaseService } from "@/database/services/database.service";
import { DrizzleClient } from "@/database/types";
import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
} from "@nestjs/common";
import { OutboundGateService } from "@/lib/outbound/outbound-gate.service";
import { CreateMessageArgs, MessageConnectionArgs } from "../args/message.args";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import {
  eqOrUndefined,
  getCursorOrder,
  tryRollback,
} from "@haorama/drizzle-postgres-extra";
import { LeadService } from "@/app/lead/services/lead.service";
import { MessageInsert } from "../models/message.model";
import { MessageDirection, MessageType } from "@nextier/common";
import { SendgridSettings } from "@/app/team/objects/sendgrid-settings.object";
import { TwilioSettings } from "@/app/team/objects/twilio-settings.object";
import { messagesTable } from "@/database/schema-alias";
import { SendgridService } from "@/app/team/services/sendgrid.service";
import { TwilioService } from "@/lib/twilio/twilio.service";
import { render } from "@react-email/render";
import { MessageEmail } from "@/emails/pages/message-email";
import { and, eq } from "drizzle-orm";

@Injectable()
export class MessageService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
    private settingService: TeamSettingService,
    private leadService: LeadService,
    private sendgridService: SendgridService,
    private twilioService: TwilioService,
    private outboundGate: OutboundGateService,
  ) {}

  paginate(options: MessageConnectionArgs) {
    const query = this.db
      .select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.teamId, options.teamId),
          eqOrUndefined(messagesTable.direction, options.direction),
        ),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async create(options: CreateMessageArgs) {
    const settings = await this.settingService.getMapped<
      SendgridSettings & TwilioSettings
    >(options.teamId);

    const isEmail = options.type === MessageType.EMAIL;
    const channel = isEmail ? "email" : "sms";

    // OUTBOUND GATE: Check suppression before sending (TCPA compliance)
    if (options.leadId) {
      const gateCheck = await this.outboundGate.canContact(
        options.leadId,
        channel,
      );
      if (!gateCheck.allowed) {
        throw new ForbiddenException(
          `Cannot send ${channel.toUpperCase()}: ${gateCheck.reason}`,
        );
      }
    }

    const result = await this.db.transaction(async (tx) => {
      try {
        const toName = options.input.toName;
        const toAddress = options.input.toAddress;
        const subject = options.input.subject || `Hello ${toName}`;
        const body = options.input.body;

        const fromAddress = isEmail
          ? settings.sendgridFromEmail
          : settings.twilioDefaultPhoneNumber;
        const fromName = isEmail
          ? settings.sendgridFromName
          : settings.twilioDefaultPhoneNumber;

        const value: MessageInsert = {
          teamId: options.teamId,
          type: options.type,
          direction: MessageDirection.OUTBOUND,
          fromAddress,
          fromName,
          toName,
          toAddress,
          subject,
          body,
        };

        if (options.leadId) {
          const lead = await this.leadService.findOneOrFail({
            teamId: options.teamId,
            id: options.leadId,
          });
          value.leadId = lead.id;
        }

        const [message] = await tx
          .insert(messagesTable)
          .values(value)
          .returning();

        if (isEmail) {
          await this.sendgridService.send({
            apiKey: settings.sendgridApiKey,
            data: {
              to: toAddress,
              from: fromAddress as string,
              subject,
              html: await render(
                MessageEmail({
                  email: toAddress,
                  name: toName,
                  subject,
                  content: body,
                }),
              ),
              headers: {
                "X-SMTPAPI": JSON.stringify({
                  unique_args: {
                    leadId: options.leadId || "NO_LEAD",
                    messageId: message.id,
                  },
                }),
              },
            },
          });
        } else {
          await this.twilioService.sendSms({
            accountSid: settings.twilioAccountSid,
            authToken: settings.twilioAuthToken,
            from: fromAddress as string,
            to: toAddress,
            body,
          });
        }

        return { message };
      } catch (error) {
        tryRollback(tx);
        throw new InternalServerErrorException(error);
      }
    });

    return result;
  }
}
