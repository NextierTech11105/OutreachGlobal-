/**
 * Voice Broadcast Controller
 *
 * Endpoints for:
 * - Voice campaign management (CRUD)
 * - Voice broadcast execution
 * - Twilio webhooks for AMD, IVR, call status
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  Header,
  Logger,
  Headers,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply } from "fastify";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { TenantContext } from "@/app/auth/decorators/tenant-context.decorator";
import { VoiceBroadcastService } from "../services/voice-broadcast.service";
import {
  voiceCampaigns,
  voiceCampaignLeads,
  ivrMenus,
} from "@/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { validateRequest } from "twilio";
import Twilio from "twilio";

// ============================================================
// CONTROLLER
// ============================================================

@Controller("voice-broadcast")
export class VoiceBroadcastController {
  private readonly logger = new Logger(VoiceBroadcastController.name);

  constructor(
    private configService: ConfigService,
    private voiceBroadcastService: VoiceBroadcastService,
    @InjectDB() private db: DrizzleClient,
  ) {}

  // ============================================================
  // CAMPAIGN CRUD
  // ============================================================

  /**
   * Create a new voice campaign.
   */
  @Post("campaigns")
  async createCampaign(
    @TenantContext("teamId") teamId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      campaignType: "ringless_vm" | "broadcast" | "ivr" | "power_dial";
      recordingUrl?: string;
      ttsMessage?: string;
      ttsVoice?: string;
      fromNumber: string;
      maxConcurrentCalls?: number;
      callsPerMinute?: number;
      dailyLimit?: number;
      ivrMenuId?: string;
    },
  ) {
    const [campaign] = await this.db
      .insert(voiceCampaigns)
      .values({
        teamId,
        name: body.name,
        description: body.description,
        campaignType: body.campaignType,
        recordingUrl: body.recordingUrl,
        ttsMessage: body.ttsMessage,
        ttsVoice: body.ttsVoice,
        fromNumber: body.fromNumber,
        maxConcurrentCalls: body.maxConcurrentCalls || 10,
        callsPerMinute: body.callsPerMinute || 30,
        dailyLimit: body.dailyLimit || 1000,
        ivrMenuId: body.ivrMenuId,
        status: "draft",
      })
      .returning();

    return { success: true, campaign };
  }

  /**
   * List voice campaigns.
   */
  @Get("campaigns")
  async listCampaigns(@TenantContext("teamId") teamId: string) {
    const campaigns = await this.db
      .select()
      .from(voiceCampaigns)
      .where(eq(voiceCampaigns.teamId, teamId))
      .orderBy(sql`${voiceCampaigns.createdAt} DESC`);

    return { success: true, campaigns };
  }

  /**
   * Get campaign details.
   */
  @Get("campaigns/:id")
  async getCampaign(
    @TenantContext("teamId") teamId: string,
    @Param("id") id: string,
  ) {
    const [campaign] = await this.db
      .select()
      .from(voiceCampaigns)
      .where(and(eq(voiceCampaigns.id, id), eq(voiceCampaigns.teamId, teamId)))
      .limit(1);

    if (!campaign) {
      throw new HttpException("Campaign not found", HttpStatus.NOT_FOUND);
    }

    return { success: true, campaign };
  }

  /**
   * Add leads to campaign queue.
   */
  @Post("campaigns/:id/leads")
  async addLeads(
    @TenantContext("teamId") teamId: string,
    @Param("id") campaignId: string,
    @Body()
    body: {
      leads: Array<{
        phoneNumber: string;
        leadId?: string;
        firstName?: string;
        lastName?: string;
        company?: string;
      }>;
    },
  ) {
    const count = await this.voiceBroadcastService.addLeadsToCampaign(
      campaignId,
      teamId,
      body.leads,
    );

    return { success: true, added: count };
  }

  /**
   * Execute a voice broadcast campaign.
   */
  @Post("campaigns/:id/execute")
  async executeCampaign(
    @TenantContext("teamId") teamId: string,
    @Param("id") campaignId: string,
    @Body() body: { maxConcurrent?: number; dryRun?: boolean },
  ) {
    // Update campaign status to running
    await this.db
      .update(voiceCampaigns)
      .set({
        status: "running",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(voiceCampaigns.id, campaignId),
          eq(voiceCampaigns.teamId, teamId),
        ),
      );

    const result = await this.voiceBroadcastService.executeBroadcast({
      campaignId,
      teamId,
      maxConcurrent: body.maxConcurrent,
      dryRun: body.dryRun,
    });

    return { success: true, result };
  }

  /**
   * Pause a running campaign.
   */
  @Post("campaigns/:id/pause")
  async pauseCampaign(
    @TenantContext("teamId") teamId: string,
    @Param("id") campaignId: string,
  ) {
    await this.db
      .update(voiceCampaigns)
      .set({ status: "paused", updatedAt: new Date() })
      .where(
        and(
          eq(voiceCampaigns.id, campaignId),
          eq(voiceCampaigns.teamId, teamId),
        ),
      );

    return { success: true, message: "Campaign paused" };
  }

  // ============================================================
  // IVR MENU CRUD
  // ============================================================

  /**
   * Create an IVR menu.
   */
  @Post("ivr-menus")
  async createIvrMenu(
    @TenantContext("teamId") teamId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      greetingRecordingUrl?: string;
      greetingTts?: string;
      greetingVoice?: string;
      menuOptions: Record<string, any>;
      timeoutSeconds?: number;
      maxRetries?: number;
    },
  ) {
    const [menu] = await this.db
      .insert(ivrMenus)
      .values({
        teamId,
        name: body.name,
        description: body.description,
        greetingRecordingUrl: body.greetingRecordingUrl,
        greetingTts: body.greetingTts,
        greetingVoice: body.greetingVoice,
        menuOptions: body.menuOptions,
        timeoutSeconds: body.timeoutSeconds,
        maxRetries: body.maxRetries,
      })
      .returning();

    return { success: true, menu };
  }

  /**
   * List IVR menus.
   */
  @Get("ivr-menus")
  async listIvrMenus(@TenantContext("teamId") teamId: string) {
    const menus = await this.db
      .select()
      .from(ivrMenus)
      .where(eq(ivrMenus.teamId, teamId))
      .orderBy(sql`${ivrMenus.createdAt} DESC`);

    return { success: true, menus };
  }

  // ============================================================
  // RINGLESS VM (Direct API)
  // ============================================================

  /**
   * Drop a single ringless voicemail.
   */
  @Post("ringless-vm")
  async dropRinglessVm(
    @TenantContext("teamId") teamId: string,
    @Body()
    body: {
      to: string;
      from: string;
      recordingUrl?: string;
      ttsMessage?: string;
      ttsVoice?: string;
    },
  ) {
    const result = await this.voiceBroadcastService.dropRinglessVoicemail({
      to: body.to,
      from: body.from,
      recordingUrl: body.recordingUrl,
      ttsMessage: body.ttsMessage,
      ttsVoice: body.ttsVoice,
    });

    return result;
  }
}

// ============================================================
// WEBHOOK CONTROLLER (Twilio Callbacks)
// ============================================================

@Controller("webhook/voice")
export class VoiceBroadcastWebhookController {
  private readonly logger = new Logger(VoiceBroadcastWebhookController.name);

  constructor(
    private configService: ConfigService,
    private voiceBroadcastService: VoiceBroadcastService,
    @InjectDB() private db: DrizzleClient,
  ) {}

  /**
   * Ringless VM TwiML - Called when ringless VM call connects.
   * Uses AMD to detect voicemail, then plays message.
   */
  @Post("ringless-vm")
  @Header("Content-Type", "application/xml")
  async handleRinglessVm(
    @Body() body: any,
    @Query("campaignId") campaignId: string,
    @Res() res: FastifyReply,
  ) {
    const { CallSid, AnsweredBy } = body;
    this.logger.log(`Ringless VM call ${CallSid}: AnsweredBy=${AnsweredBy}`);

    const VoiceResponse = Twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // If machine/voicemail detected, wait for beep then play message
    if (AnsweredBy === "machine_end_beep" || AnsweredBy === "machine_end_silence") {
      // Get campaign recording
      if (campaignId) {
        const [campaign] = await this.db
          .select()
          .from(voiceCampaigns)
          .where(eq(voiceCampaigns.id, campaignId))
          .limit(1);

        if (campaign?.recordingUrl) {
          response.play(campaign.recordingUrl);
        } else if (campaign?.ttsMessage) {
          response.say(
            { voice: (campaign.ttsVoice || "Polly.Joanna") as any },
            campaign.ttsMessage,
          );
        }
      }
      response.hangup();
    } else if (AnsweredBy === "human") {
      // Human answered - for ringless VM, we hang up
      // (For broadcast, we'd play the message)
      response.hangup();
    } else {
      // Still detecting - pause briefly
      response.pause({ length: 1 });
      response.redirect(`/webhook/voice/ringless-vm?campaignId=${campaignId || ""}`);
    }

    return res.status(200).send(response.toString());
  }

  /**
   * AMD Status Callback - Asynchronous AMD result.
   */
  @Post("amd-status")
  async handleAmdStatus(@Body() body: any) {
    const { CallSid, AnsweredBy, MachineDetectionDuration } = body;
    this.logger.log(
      `AMD Status: ${CallSid} - ${AnsweredBy} (${MachineDetectionDuration}ms)`,
    );

    // Update lead record with AMD result
    await this.db
      .update(voiceCampaignLeads)
      .set({
        answeredBy: AnsweredBy,
        updatedAt: new Date(),
      })
      .where(eq(voiceCampaignLeads.callSid, CallSid));

    return { received: true };
  }

  /**
   * Broadcast Answer - Called when broadcast call is answered.
   * Plays message to live answers.
   */
  @Post("broadcast-answer")
  @Header("Content-Type", "application/xml")
  async handleBroadcastAnswer(
    @Body() body: any,
    @Query("campaignId") campaignId: string,
    @Res() res: FastifyReply,
  ) {
    const { CallSid, AnsweredBy } = body;
    this.logger.log(`Broadcast answer ${CallSid}: AnsweredBy=${AnsweredBy}`);

    const VoiceResponse = Twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Get campaign
    const [campaign] = await this.db
      .select()
      .from(voiceCampaigns)
      .where(eq(voiceCampaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      response.say("Sorry, this call cannot be completed.");
      response.hangup();
      return res.status(200).send(response.toString());
    }

    if (AnsweredBy === "human") {
      // Human answered - play the broadcast message
      if (campaign.campaignType === "ivr" && campaign.ivrMenuId) {
        // Redirect to IVR menu
        response.redirect(`/webhook/voice/ivr-menu?menuId=${campaign.ivrMenuId}`);
      } else {
        // Play recording or TTS
        if (campaign.recordingUrl) {
          response.play(campaign.recordingUrl);
        } else if (campaign.ttsMessage) {
          response.say(
            { voice: (campaign.ttsVoice || "Polly.Joanna") as any },
            campaign.ttsMessage,
          );
        }
        response.hangup();
      }
    } else if (AnsweredBy?.startsWith("machine")) {
      // Machine - leave voicemail after beep
      response.pause({ length: 1 });
      if (campaign.recordingUrl) {
        response.play(campaign.recordingUrl);
      } else if (campaign.ttsMessage) {
        response.say(
          { voice: (campaign.ttsVoice || "Polly.Joanna") as any },
          campaign.ttsMessage,
        );
      }
      response.hangup();
    } else {
      // Still detecting
      response.pause({ length: 1 });
      response.redirect(`/webhook/voice/broadcast-answer?campaignId=${campaignId}`);
    }

    return res.status(200).send(response.toString());
  }

  /**
   * Broadcast Status Callback - Call completion status.
   */
  @Post("broadcast-status")
  async handleBroadcastStatus(@Body() body: any) {
    const { CallSid, CallStatus, CallDuration, AnsweredBy } = body;
    this.logger.log(
      `Broadcast status: ${CallSid} - ${CallStatus} (${CallDuration}s, ${AnsweredBy})`,
    );

    // Map status to result
    let result: string;
    switch (CallStatus) {
      case "completed":
        result = AnsweredBy === "human" ? "human_answer" : "machine_answer";
        break;
      case "no-answer":
        result = "no_answer";
        break;
      case "busy":
        result = "busy";
        break;
      case "failed":
      case "canceled":
        result = "failed";
        break;
      default:
        result = "pending";
    }

    // Update lead record
    if (result !== "pending") {
      await this.db
        .update(voiceCampaignLeads)
        .set({
          result: result as any,
          answeredBy: AnsweredBy,
          callDurationSeconds: CallDuration ? parseInt(CallDuration) : null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(voiceCampaignLeads.callSid, CallSid));

      // Update campaign stats
      const [lead] = await this.db
        .select({ campaignId: voiceCampaignLeads.campaignId })
        .from(voiceCampaignLeads)
        .where(eq(voiceCampaignLeads.callSid, CallSid))
        .limit(1);

      if (lead) {
        const statsUpdate: Record<string, any> = {
          callsCompleted: sql`${voiceCampaigns.callsCompleted} + 1`,
          updatedAt: new Date(),
        };

        if (result === "human_answer") {
          statsUpdate.humanAnswers = sql`${voiceCampaigns.humanAnswers} + 1`;
        } else if (result === "machine_answer") {
          statsUpdate.machineAnswers = sql`${voiceCampaigns.machineAnswers} + 1`;
        } else if (result === "no_answer") {
          statsUpdate.noAnswers = sql`${voiceCampaigns.noAnswers} + 1`;
        } else if (result === "failed") {
          statsUpdate.failed = sql`${voiceCampaigns.failed} + 1`;
        }

        await this.db
          .update(voiceCampaigns)
          .set(statsUpdate)
          .where(eq(voiceCampaigns.id, lead.campaignId));
      }
    }

    return { received: true };
  }

  /**
   * IVR Menu - Display IVR menu and gather input.
   */
  @Post("ivr-menu")
  @Header("Content-Type", "application/xml")
  async handleIvrMenu(
    @Query("menuId") menuId: string,
    @Query("retry") retry: string,
    @Res() res: FastifyReply,
  ) {
    this.logger.log(`IVR Menu: ${menuId}, retry=${retry}`);

    const twiml = await this.voiceBroadcastService.generateIvrTwiml(menuId);
    return res.status(200).send(twiml);
  }

  /**
   * IVR Input - Handle DTMF keypress.
   */
  @Post("ivr-input")
  @Header("Content-Type", "application/xml")
  async handleIvrInput(
    @Body() body: any,
    @Query("menuId") menuId: string,
    @Res() res: FastifyReply,
  ) {
    const { Digits, CallSid } = body;
    this.logger.log(`IVR Input: ${CallSid} pressed ${Digits} on menu ${menuId}`);

    // Log the input for tracking
    await this.db
      .update(voiceCampaignLeads)
      .set({
        dtmfInput: Digits,
        updatedAt: new Date(),
      })
      .where(eq(voiceCampaignLeads.callSid, CallSid));

    const twiml = await this.voiceBroadcastService.handleIvrInput(
      menuId,
      Digits,
    );
    return res.status(200).send(twiml);
  }

  /**
   * IVR Voicemail - Handle voicemail recording from IVR.
   */
  @Post("ivr-voicemail")
  async handleIvrVoicemail(
    @Body() body: any,
    @Query("menuId") menuId: string,
  ) {
    const { CallSid, RecordingUrl, RecordingDuration, TranscriptionText } = body;
    this.logger.log(`IVR Voicemail: ${CallSid} - ${RecordingDuration}s`);

    // Store the voicemail
    // TODO: Implement voicemail storage

    return { received: true };
  }
}
