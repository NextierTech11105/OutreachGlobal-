import {
  Controller,
  Post,
  Body,
  Query,
  Res,
  Logger,
  Get,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply } from "fastify";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq } from "drizzle-orm";
import { leadsTable, inboxItemsTable } from "@/database/schema-alias";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  ResponseClassification,
  InboxPriority,
  BucketType,
} from "@nextier/common";

/**
 * SIGNALHOUSE WEBHOOK CONTROLLER
 *
 * This is the MONEY endpoint. Every inbound SMS hits here.
 *
 * SignalHouse events:
 * - SMS_RECEIVED - Lead replied to our outbound
 * - SMS_SENT - Confirmation our message went out
 * - SMS_DELIVERED - Carrier confirmed delivery
 * - SMS_FAILED - Carrier rejected
 * - NUMBER_PURCHASED - New number provisioned
 * - BRAND_ADD - 10DLC brand registered
 * - CAMPAIGN_ADD - 10DLC campaign created
 * - CAMPAIGN_EXPIRED - Campaign needs renewal
 */

interface SignalHouseWebhookPayload {
  event: string;
  data: {
    from?: string;
    to?: string;
    message?: string;
    messageId?: string;
    status?: string;
    timestamp?: string;
    campaignId?: string;
    brandId?: string;
    phoneNumber?: string;
    direction?: "inbound" | "outbound";
    [key: string]: unknown;
  };
}

// Response classification patterns
const POSITIVE_PATTERNS =
  /\b(yes|yeah|yep|interested|call|info|more|details|help|please|sounds good|tell me|okay|ok)\b/i;
const DNC_PATTERNS =
  /\b(stop|unsubscribe|cancel|end|quit|optout|opt out|remove|no more|don't text|dont text)\b/i;
const WRONG_NUMBER_PATTERNS =
  /\b(wrong number|wrong person|not me|who is this)\b/i;

type LocalClassification = "positive" | "dnc" | "wrong_number" | "neutral";

function classifyResponse(message: string): LocalClassification {
  const text = message.toLowerCase().trim();

  // DNC takes priority (compliance)
  if (DNC_PATTERNS.test(text)) return "dnc";

  // Wrong number
  if (WRONG_NUMBER_PATTERNS.test(text)) return "wrong_number";

  // Positive
  if (POSITIVE_PATTERNS.test(text)) return "positive";

  // Default
  return "neutral";
}

@Controller("webhook/signalhouse")
export class SignalHouseWebhookController {
  private readonly logger = new Logger(SignalHouseWebhookController.name);
  private readonly webhookToken: string;

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
    @InjectQueue("lead") private leadQueue: Queue,
  ) {
    this.webhookToken =
      this.configService.get("SIGNALHOUSE_WEBHOOK_TOKEN") ||
      "b63df419c4c90433467694ef755f015cc1d10ddd3b76ac6a7cf56bfc3681c6d2";
  }

  /**
   * GET /api/webhook/signalhouse
   * Health check
   */
  @Get()
  async healthCheck(@Query("token") token: string, @Res() res: FastifyReply) {
    if (token !== this.webhookToken) {
      return res.status(401).send({ error: "Invalid token" });
    }

    return res.status(200).send({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * POST /api/webhook/signalhouse
   * Main webhook handler - ALL SignalHouse events
   */
  @Post()
  async handleWebhook(
    @Query("token") token: string,
    @Body() payload: SignalHouseWebhookPayload,
    @Res() res: FastifyReply,
  ) {
    if (token !== this.webhookToken) {
      this.logger.warn("Invalid webhook token received");
      return res.status(401).send({ error: "Invalid token" });
    }

    const { event, data } = payload;
    this.logger.log(`SignalHouse webhook: ${event}`, { data });

    try {
      switch (event) {
        case "SMS_RECEIVED":
          await this.handleInboundSms(data);
          break;
        case "SMS_SENT":
        case "SMS_DELIVERED":
        case "SMS_FAILED":
          await this.handleDeliveryStatus(event, data);
          break;
        case "NUMBER_PURCHASED":
        case "NUMBER_PROVISIONED":
        case "NUMBER_PORTED":
          this.logger.log(`Number event: ${event}`, data);
          break;
        case "BRAND_ADD":
        case "BRAND_DELETE":
        case "CAMPAIGN_ADD":
        case "CAMPAIGN_UPDATE":
        case "CAMPAIGN_EXPIRED":
          this.logger.log(`10DLC event: ${event}`, data);
          break;
        default:
          this.logger.log(`Unknown event: ${event}`, data);
      }

      return res.status(200).send({ success: true, event });
    } catch (error) {
      this.logger.error(`Webhook error: ${event}`, error);
      return res.status(500).send({ error: "Processing failed" });
    }
  }

  /**
   * Handle inbound SMS - THE MONEY HANDLER
   */
  private async handleInboundSms(data: SignalHouseWebhookPayload["data"]) {
    const { from, to, message, messageId, timestamp } = data;

    if (!from || !message) {
      this.logger.warn("Invalid inbound SMS - missing from or message");
      return;
    }

    // Normalize phone number
    const normalizedPhone = from.replace(/\D/g, "").slice(-10);

    // Classify the response
    const classification = classifyResponse(message);
    this.logger.log(
      `Inbound SMS from ${from}: "${message}" → ${classification}`,
    );

    // Find lead by phone number
    const lead = await this.db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.phone, normalizedPhone))
      .limit(1)
      .then((rows) => rows[0]);

    if (!lead) {
      this.logger.warn(`No lead found for phone: ${from}`);
      return;
    }

    // Map local classification to enum
    const classificationMap: Record<
      LocalClassification,
      ResponseClassification
    > = {
      positive: ResponseClassification.POSITIVE,
      dnc: ResponseClassification.DNC_REQUEST,
      wrong_number: ResponseClassification.WRONG_NUMBER,
      neutral: ResponseClassification.NEUTRAL,
    };

    const priorityMap: Record<LocalClassification, InboxPriority> = {
      positive: InboxPriority.HOT,
      dnc: InboxPriority.URGENT,
      wrong_number: InboxPriority.COLD,
      neutral: InboxPriority.WARM,
    };

    const bucketMap: Record<LocalClassification, BucketType> = {
      positive: BucketType.POSITIVE_RESPONSES,
      dnc: BucketType.LEGAL_DNC,
      wrong_number: BucketType.WRONG_NUMBER,
      neutral: BucketType.UNIVERSAL_INBOX,
    };

    // Log to inbox
    await this.db.insert(inboxItemsTable).values({
      teamId: lead.teamId,
      leadId: lead.id,
      phoneNumber: from,
      responseText: message,
      classification: classificationMap[classification],
      priority: priorityMap[classification],
      priorityScore:
        classification === "positive"
          ? 100
          : classification === "dnc"
            ? 90
            : classification === "wrong_number"
              ? 20
              : 50,
      currentBucket: bucketMap[classification],
      requiresReview: classification === "positive" || classification === "dnc",
      metadata: {
        externalId: messageId,
        toNumber: to,
        receivedAt: timestamp,
        source: "signalhouse",
      },
    });

    // Route based on classification
    switch (classification) {
      case "positive":
        await this.leadQueue.add("state-transition", {
          leadId: lead.id,
          newState: "high_intent",
          trigger: "inbound_sms_positive",
          message,
        });
        this.logger.log(
          `🔥 HOT LEAD: ${lead.firstName} ${lead.lastName} - "${message}"`,
        );
        break;

      case "dnc":
        await this.leadQueue.add("state-transition", {
          leadId: lead.id,
          newState: "suppressed",
          trigger: "dnc_request",
          message,
        });
        this.logger.log(`🛑 DNC: ${lead.firstName} ${lead.lastName}`);
        break;

      case "wrong_number":
        await this.leadQueue.add("state-transition", {
          leadId: lead.id,
          newState: "suppressed",
          trigger: "wrong_number",
          message,
        });
        this.logger.log(`❌ WRONG NUMBER: ${lead.firstName} ${lead.lastName}`);
        break;

      default:
        await this.leadQueue.add("state-transition", {
          leadId: lead.id,
          newState: "responded",
          trigger: "inbound_sms",
          message,
        });
        break;
    }
  }

  /**
   * Handle delivery status updates
   */
  private async handleDeliveryStatus(
    event: string,
    data: SignalHouseWebhookPayload["data"],
  ) {
    const { messageId, status, from, to } = data;
    this.logger.log(`Delivery status: ${event}`, {
      messageId,
      status,
      from,
      to,
    });
  }
}
