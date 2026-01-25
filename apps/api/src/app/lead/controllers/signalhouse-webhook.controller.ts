import {
  Controller,
  Post,
  Body,
  Query,
  Res,
  Logger,
  Get,
  Headers,
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
import { SabrinaSdrService } from "@/app/inbox/services/sabrina-sdr.service";
import { AgentRouterService } from "@/app/inbox/services/agent-router.service";

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
    private sabrinaSdrService: SabrinaSdrService,
    private agentRouter: AgentRouterService,
  ) {
    const token = this.configService.get<string>("SIGNALHOUSE_WEBHOOK_TOKEN");
    if (!token) {
      this.logger.warn(
        "SIGNALHOUSE_WEBHOOK_TOKEN not configured - webhook endpoint will reject all requests",
      );
    }
    this.webhookToken = token || "";
  }

  /**
   * Validate webhook token from either Authorization header (preferred) or query param (legacy).
   * Header-based auth is preferred because query params appear in server logs.
   *
   * Accepts:
   * - Authorization: Bearer <token>
   * - X-Webhook-Token: <token>
   * - ?token=<token> (legacy, will be deprecated)
   */
  private validateToken(
    authHeader: string | undefined,
    webhookTokenHeader: string | undefined,
    queryToken: string | undefined,
  ): boolean {
    // Priority: Authorization header > X-Webhook-Token > query param
    let token: string | undefined;

    // Check Authorization header first (Bearer token)
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    // Check X-Webhook-Token header
    else if (webhookTokenHeader) {
      token = webhookTokenHeader;
    }
    // Fallback to query param (legacy - will log warning)
    else if (queryToken) {
      this.logger.warn(
        "SignalHouse webhook using query param token - update to header auth for security",
      );
      token = queryToken;
    }

    if (!token) {
      return false;
    }

    return token === this.webhookToken;
  }

  /**
   * GET /api/webhook/signalhouse
   * Health check
   */
  @Get()
  async healthCheck(
    @Headers("authorization") authHeader: string | undefined,
    @Headers("x-webhook-token") webhookTokenHeader: string | undefined,
    @Query("token") queryToken: string | undefined,
    @Res() res: FastifyReply,
  ) {
    if (!this.validateToken(authHeader, webhookTokenHeader, queryToken)) {
      return res.status(401).send({ error: "Invalid or missing token" });
    }

    return res.status(200).send({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * POST /api/webhook/signalhouse
   * Main webhook handler - ALL SignalHouse events
   *
   * Authentication (in order of preference):
   * 1. Authorization: Bearer <token>
   * 2. X-Webhook-Token: <token>
   * 3. ?token=<token> (deprecated - logs warning)
   */
  @Post()
  async handleWebhook(
    @Headers("authorization") authHeader: string | undefined,
    @Headers("x-webhook-token") webhookTokenHeader: string | undefined,
    @Query("token") queryToken: string | undefined,
    @Body() payload: SignalHouseWebhookPayload,
    @Res() res: FastifyReply,
  ) {
    if (!this.validateToken(authHeader, webhookTokenHeader, queryToken)) {
      this.logger.warn("SignalHouse webhook rejected: invalid or missing token");
      return res.status(401).send({ error: "Invalid or missing token" });
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

        // Route to correct agent (GIANNA/CATHY/SABRINA) based on conversation
        try {
          const agentAssignment = await this.agentRouter.routeToAgent(
            lead.teamId,
            lead.id,
            message,
            to, // The number the lead replied TO determines which agent
          );

          this.logger.log(
            `🤖 Routed to ${agentAssignment.agent.toUpperCase()}: ${agentAssignment.reason}`,
          );

          // Process through SABRINA (handles all agents' response generation)
          const sabrinaResult =
            await this.sabrinaSdrService.processIncomingResponse(
              lead.teamId,
              messageId || `inbound_${Date.now()}`,
              message,
              from,
              undefined, // campaignId - determined from lead context
            );

          if (sabrinaResult.pendingApprovalId) {
            this.logger.log(
              `📨 ${agentAssignment.agent.toUpperCase()} response queued for approval: ${sabrinaResult.pendingApprovalId}`,
            );
            this.logger.log(
              `💬 Suggested: "${sabrinaResult.suggestedResponse}"`,
            );
          }
        } catch (err) {
          this.logger.error(`Failed to process with agent router: ${err}`);
        }
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
