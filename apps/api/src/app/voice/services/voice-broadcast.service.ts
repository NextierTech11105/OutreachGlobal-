/**
 * Voice Broadcast Service
 *
 * Handles:
 * - Ringless Voicemail Drop (AMD → leave message without ringing)
 * - Voice Broadcasting (play message to live answers)
 * - IVR Menu execution
 * - Campaign execution with rate limiting
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  voiceCampaigns,
  voiceCampaignLeads,
  ivrMenus,
} from "@/database/schema";
import { eq, and, sql, asc, inArray } from "drizzle-orm";
import Twilio from "twilio";

// ============================================================
// TYPES
// ============================================================

export interface VoiceBroadcastOptions {
  campaignId: string;
  teamId: string;
  maxConcurrent?: number;
  dryRun?: boolean;
}

export interface VoiceBroadcastResult {
  attempted: number;
  completed: number;
  humanAnswers: number;
  machineAnswers: number;
  vmDropped: number;
  noAnswers: number;
  failed: number;
  errors: string[];
}

export interface RinglessVmOptions {
  to: string;
  from: string;
  recordingUrl?: string;
  ttsMessage?: string;
  ttsVoice?: string;
  campaignId?: string;
  leadId?: string;
}

export interface RinglessVmResult {
  success: boolean;
  callSid?: string;
  answeredBy?: string;
  error?: string;
}

// ============================================================
// SERVICE
// ============================================================

@Injectable()
export class VoiceBroadcastService {
  private readonly logger = new Logger(VoiceBroadcastService.name);
  private twilioClient: Twilio.Twilio;

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
  ) {
    const accountSid = this.configService.get("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get("TWILIO_AUTH_TOKEN");

    if (accountSid && authToken) {
      this.twilioClient = Twilio(accountSid, authToken);
    } else {
      this.logger.warn("Twilio credentials not configured");
    }
  }

  // ============================================================
  // RINGLESS VOICEMAIL DROP
  // ============================================================

  /**
   * Drop a voicemail without ringing the phone.
   *
   * Uses Twilio's AMD (Answering Machine Detection) to detect voicemail,
   * then plays the message directly. Hangs up if human answers.
   *
   * @param options - Ringless VM options
   * @returns Result with callSid or error
   */
  async dropRinglessVoicemail(
    options: RinglessVmOptions,
  ): Promise<RinglessVmResult> {
    const { to, from, recordingUrl, ttsMessage, ttsVoice = "Polly.Joanna" } =
      options;

    if (!this.twilioClient) {
      return { success: false, error: "Twilio not configured" };
    }

    if (!recordingUrl && !ttsMessage) {
      return { success: false, error: "Must provide recordingUrl or ttsMessage" };
    }

    try {
      // Build TwiML URL for the call
      const webhookBaseUrl = this.configService.get("API_URL") || "https://api.nextier.ai";
      const twimlUrl = `${webhookBaseUrl}/webhook/voice/ringless-vm`;

      // Initiate call with AMD enabled
      const call = await this.twilioClient.calls.create({
        to,
        from,
        url: twimlUrl,
        method: "POST",
        machineDetection: "DetectMessageEnd", // Wait for beep before playing
        machineDetectionTimeout: 30,
        asyncAmd: "true", // Asynchronous AMD callback
        asyncAmdStatusCallback: `${webhookBaseUrl}/webhook/voice/amd-status`,
        asyncAmdStatusCallbackMethod: "POST",
        statusCallback: `${webhookBaseUrl}/webhook/voice/broadcast-status`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        // Pass recording info in SIP headers (available in webhook)
        // Alternative: Use a database lookup in the webhook
      });

      this.logger.log(`Ringless VM call initiated: ${call.sid} to ${to}`);

      return {
        success: true,
        callSid: call.sid,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Call failed";
      this.logger.error(`Ringless VM failed to ${to}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  // ============================================================
  // VOICE BROADCASTING
  // ============================================================

  /**
   * Execute a voice broadcast campaign.
   * Calls leads in queue and plays message based on campaign type.
   *
   * @param options - Campaign execution options
   * @returns Execution results
   */
  async executeBroadcast(
    options: VoiceBroadcastOptions,
  ): Promise<VoiceBroadcastResult> {
    const { campaignId, teamId, maxConcurrent = 10, dryRun = false } = options;

    // Get campaign
    const [campaign] = await this.db
      .select()
      .from(voiceCampaigns)
      .where(
        and(eq(voiceCampaigns.id, campaignId), eq(voiceCampaigns.teamId, teamId)),
      )
      .limit(1);

    if (!campaign) {
      return {
        attempted: 0,
        completed: 0,
        humanAnswers: 0,
        machineAnswers: 0,
        vmDropped: 0,
        noAnswers: 0,
        failed: 0,
        errors: ["Campaign not found"],
      };
    }

    if (!campaign.fromNumber) {
      return {
        attempted: 0,
        completed: 0,
        humanAnswers: 0,
        machineAnswers: 0,
        vmDropped: 0,
        noAnswers: 0,
        failed: 0,
        errors: ["No from number configured for campaign"],
      };
    }

    // Get pending leads
    const leads = await this.db
      .select()
      .from(voiceCampaignLeads)
      .where(
        and(
          eq(voiceCampaignLeads.campaignId, campaignId),
          eq(voiceCampaignLeads.result, "pending"),
        ),
      )
      .orderBy(asc(voiceCampaignLeads.queuePosition))
      .limit(maxConcurrent);

    if (leads.length === 0) {
      return {
        attempted: 0,
        completed: 0,
        humanAnswers: 0,
        machineAnswers: 0,
        vmDropped: 0,
        noAnswers: 0,
        failed: 0,
        errors: ["No pending leads in queue"],
      };
    }

    const results: VoiceBroadcastResult = {
      attempted: 0,
      completed: 0,
      humanAnswers: 0,
      machineAnswers: 0,
      vmDropped: 0,
      noAnswers: 0,
      failed: 0,
      errors: [],
    };

    // Process leads
    for (const lead of leads) {
      results.attempted++;

      if (dryRun) {
        this.logger.debug(`[DRY RUN] Would call ${lead.phoneNumber}`);
        continue;
      }

      try {
        let callResult: RinglessVmResult;

        if (campaign.campaignType === "ringless_vm") {
          callResult = await this.dropRinglessVoicemail({
            to: lead.phoneNumber,
            from: campaign.fromNumber,
            recordingUrl: campaign.recordingUrl || undefined,
            ttsMessage: campaign.ttsMessage || undefined,
            ttsVoice: campaign.ttsVoice || undefined,
            campaignId: campaign.id,
            leadId: lead.leadId || undefined,
          });
        } else {
          // Regular broadcast call
          callResult = await this.initiateCall({
            to: lead.phoneNumber,
            from: campaign.fromNumber,
            recordingUrl: campaign.recordingUrl || undefined,
            ttsMessage: campaign.ttsMessage || undefined,
            campaignId: campaign.id,
          });
        }

        if (callResult.success) {
          // Update lead with call SID
          await this.db
            .update(voiceCampaignLeads)
            .set({
              callSid: callResult.callSid,
              attemptedAt: new Date(),
              attemptCount: sql`${voiceCampaignLeads.attemptCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(voiceCampaignLeads.id, lead.id));
        } else {
          results.failed++;
          results.errors.push(`${lead.phoneNumber}: ${callResult.error}`);

          // Mark as failed if max attempts reached
          const newAttemptCount = (lead.attemptCount || 0) + 1;
          if (newAttemptCount >= (lead.maxAttempts || 3)) {
            await this.db
              .update(voiceCampaignLeads)
              .set({
                result: "failed",
                errorMessage: callResult.error,
                attemptCount: newAttemptCount,
                updatedAt: new Date(),
              })
              .where(eq(voiceCampaignLeads.id, lead.id));
          } else {
            // Schedule retry
            await this.db
              .update(voiceCampaignLeads)
              .set({
                attemptCount: newAttemptCount,
                nextRetryAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
                errorMessage: callResult.error,
                updatedAt: new Date(),
              })
              .where(eq(voiceCampaignLeads.id, lead.id));
          }
        }

        // Rate limiting delay
        await this.delay(2000); // 30 calls/min max
      } catch (err) {
        results.failed++;
        results.errors.push(
          `${lead.phoneNumber}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    // Update campaign stats
    await this.db
      .update(voiceCampaigns)
      .set({
        callsAttempted: sql`${voiceCampaigns.callsAttempted} + ${results.attempted}`,
        failed: sql`${voiceCampaigns.failed} + ${results.failed}`,
        updatedAt: new Date(),
      })
      .where(eq(voiceCampaigns.id, campaignId));

    return results;
  }

  // ============================================================
  // CALL INITIATION (Regular broadcast)
  // ============================================================

  /**
   * Initiate a regular broadcast call (plays message to live answers).
   */
  private async initiateCall(options: {
    to: string;
    from: string;
    recordingUrl?: string;
    ttsMessage?: string;
    campaignId: string;
  }): Promise<RinglessVmResult> {
    if (!this.twilioClient) {
      return { success: false, error: "Twilio not configured" };
    }

    try {
      const webhookBaseUrl = this.configService.get("API_URL") || "https://api.nextier.ai";

      const call = await this.twilioClient.calls.create({
        to: options.to,
        from: options.from,
        url: `${webhookBaseUrl}/webhook/voice/broadcast-answer?campaignId=${options.campaignId}`,
        method: "POST",
        machineDetection: "Enable",
        statusCallback: `${webhookBaseUrl}/webhook/voice/broadcast-status`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });

      return { success: true, callSid: call.sid };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Call failed",
      };
    }
  }

  // ============================================================
  // IVR MENU GENERATION
  // ============================================================

  /**
   * Generate TwiML for an IVR menu.
   */
  async generateIvrTwiml(menuId: string): Promise<string> {
    const [menu] = await this.db
      .select()
      .from(ivrMenus)
      .where(eq(ivrMenus.id, menuId))
      .limit(1);

    if (!menu) {
      return this.getErrorTwiml("Menu not found");
    }

    const VoiceResponse = Twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Play greeting
    if (menu.greetingRecordingUrl) {
      response.play(menu.greetingRecordingUrl);
    } else if (menu.greetingTts) {
      response.say({ voice: (menu.greetingVoice || "Polly.Joanna") as any }, menu.greetingTts);
    }

    // Gather DTMF input
    const gather = response.gather({
      numDigits: 1,
      action: `/webhook/voice/ivr-input?menuId=${menuId}`,
      method: "POST",
      timeout: menu.timeoutSeconds || 10,
    });

    // If timeout, play timeout message and retry or fallback
    if (menu.timeoutRecordingUrl) {
      response.play(menu.timeoutRecordingUrl);
    } else if (menu.timeoutTts) {
      response.say(
        { voice: (menu.greetingVoice || "Polly.Joanna") as any },
        menu.timeoutTts,
      );
    }

    // Redirect back to menu for retry (up to maxRetries)
    response.redirect(`/webhook/voice/ivr-menu?menuId=${menuId}&retry=1`);

    return response.toString();
  }

  /**
   * Handle DTMF input for IVR menu.
   */
  async handleIvrInput(menuId: string, digits: string): Promise<string> {
    const [menu] = await this.db
      .select()
      .from(ivrMenus)
      .where(eq(ivrMenus.id, menuId))
      .limit(1);

    if (!menu) {
      return this.getErrorTwiml("Menu not found");
    }

    const options = (menu.menuOptions as Record<string, any>) || {};
    const option = options[digits];

    const VoiceResponse = Twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (!option) {
      // Invalid input
      if (menu.invalidRecordingUrl) {
        response.play(menu.invalidRecordingUrl);
      } else if (menu.invalidTts) {
        response.say(
          { voice: (menu.greetingVoice || "Polly.Joanna") as any },
          menu.invalidTts,
        );
      }
      response.redirect(`/webhook/voice/ivr-menu?menuId=${menuId}`);
      return response.toString();
    }

    // Process action
    switch (option.action) {
      case "transfer":
        response.dial().number(option.number);
        break;

      case "submenu":
        response.redirect(`/webhook/voice/ivr-menu?menuId=${option.menuId}`);
        break;

      case "voicemail":
        response.say(
          { voice: (menu.greetingVoice || "Polly.Joanna") as any },
          option.message || "Please leave a message after the beep.",
        );
        response.record({
          transcribe: true,
          maxLength: 120,
          action: `/webhook/voice/ivr-voicemail?menuId=${menuId}`,
        });
        break;

      case "play":
        if (option.recordingUrl) {
          response.play(option.recordingUrl);
        } else if (option.message) {
          response.say({ voice: (menu.greetingVoice || "Polly.Joanna") as any }, option.message);
        }
        response.hangup();
        break;

      case "hangup":
      default:
        response.hangup();
        break;
    }

    return response.toString();
  }

  // ============================================================
  // CAMPAIGN MANAGEMENT
  // ============================================================

  /**
   * Add leads to a voice campaign queue.
   */
  async addLeadsToCampaign(
    campaignId: string,
    teamId: string,
    leads: Array<{
      phoneNumber: string;
      leadId?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
    }>,
  ): Promise<number> {
    if (leads.length === 0) return 0;

    // Get current max queue position
    const [maxPos] = await this.db
      .select({ max: sql<number>`COALESCE(MAX(queue_position), 0)` })
      .from(voiceCampaignLeads)
      .where(eq(voiceCampaignLeads.campaignId, campaignId));

    let position = (maxPos?.max || 0) + 1;

    const records = leads.map((lead) => ({
      campaignId,
      teamId,
      phoneNumber: lead.phoneNumber,
      leadId: lead.leadId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company,
      queuePosition: position++,
      result: "pending" as const,
    }));

    await this.db.insert(voiceCampaignLeads).values(records);

    // Update campaign total
    await this.db
      .update(voiceCampaigns)
      .set({
        totalLeads: sql`${voiceCampaigns.totalLeads} + ${leads.length}`,
        updatedAt: new Date(),
      })
      .where(eq(voiceCampaigns.id, campaignId));

    return leads.length;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getErrorTwiml(message: string): string {
    const VoiceResponse = Twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say({ voice: "Polly.Joanna" as any }, message);
    response.hangup();
    return response.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
