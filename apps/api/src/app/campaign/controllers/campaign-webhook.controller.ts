import { InjectDB } from "@/database/decorators";
import { campaignEventsTable } from "@/database/schema-alias";
import { DrizzleClient } from "@/database/types";
import { SendgridMailEvent } from "@/lib/mail/sendgrid-mail.enum";
import { parseSchema } from "@/lib/zod/validate-input";
import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "@nextier/dto";
import { EventWebhook } from "@sendgrid/eventwebhook";
import { FastifyReply, FastifyRequest } from "fastify";

const mapEvents = {
  [SendgridMailEvent.OPEN]: "OPENED",
  [SendgridMailEvent.CLICK]: "CLICKED",
  [SendgridMailEvent.DELIVERED]: "DELIVERED",
  [SendgridMailEvent.BOUNCED]: "BOUNCED",
};

@Controller("webhook/campaign")
export class CampaignWebhookController {
  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
  ) {}

  private validateSignature(
    rawBody: Buffer,
    signature: string,
    timestamp: string,
  ) {
    if (this.configService.get("APP_ENV") === "local") {
      return true;
    }

    const publicKey = this.configService.get("MAIL_WEBHOOK_KEY");
    const eventWebhook = new EventWebhook();
    const ecdsa = eventWebhook.convertPublicKeyToECDSA(publicKey);

    const isValid = eventWebhook.verifySignature(
      ecdsa,
      rawBody,
      signature,
      timestamp,
    );
    return isValid;
  }

  @Post()
  async handleMail(
    @Headers() headers: any,
    @Res() res: FastifyReply,
    @Body() body: any[],
    @Req() req: RawBodyRequest<FastifyRequest>,
  ) {
    if (!Array.isArray(body)) {
      return res.status(401).send({
        message: "invalid data",
      });
    }
    const acceptedEvents = [
      SendgridMailEvent.CLICK,
      SendgridMailEvent.DELIVERED,
      SendgridMailEvent.OPEN,
      SendgridMailEvent.BOUNCED,
    ];
    const signature = headers["x-twilio-email-event-webhook-signature"];
    const timestamp = headers["x-twilio-email-event-webhook-timestamp"];

    const data = parseSchema(
      z.object({
        campaignId: z.string(),
        leadId: z.string(),
        sequenceId: z.string(),
        event: z.string(),
      }),
      body[0],
    );

    if (!signature || !timestamp) {
      return res.status(401).send({
        message: "Missing signature or timestamp",
      });
    }
    const isValid = this.validateSignature(
      req.rawBody as Buffer,
      signature,
      timestamp,
    );

    if (!isValid) {
      console.log("invalid signature", {
        key: this.configService.get("MAIL_WEBHOOK_KEY"),
        signature,
        timestamp,
      });
      return res.status(401).send({
        message: "Invalid signature",
      });
    }

    if (acceptedEvents.includes(data.event as SendgridMailEvent)) {
      try {
        await this.db.insert(campaignEventsTable).values({
          sequenceId: data.sequenceId,
          leadId: data.leadId,
          campaignId: data.campaignId,
          name: mapEvents[data.event] || data.event,
          metadata: body[0] || null,
        });
      } catch (error) {
        // console.log(error);
      }
    }

    return res.status(200).send({
      signatureValid: isValid,
      message: "OK",
    });
  }
}
