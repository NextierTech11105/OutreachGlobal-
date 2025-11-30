import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq } from "drizzle-orm";
import {
  leadsTable,
  inboxItemsTable,
  teamsTable,
  campaignsTable,
  aiSdrAvatarsTable,
} from "@/database/schema-alias";
import { ResponseClassification, InboxPriority, BucketType } from "@nextier/common";

interface InboundCallResult {
  leadId?: string;
  leadName?: string;
  teamId?: string;
  calendarUrl?: string;
  voicemailPlayed: boolean;
  smsSent: boolean;
  // SDR persona info for custom voicemail
  sdrName?: string;
  sdrVoicemailUrl?: string;
}

interface VoicemailConfig {
  greeting: string;
  calendarUrl: string;
  smsFollowUp: boolean;
  // Custom recording URL from the SDR persona
  recordingUrl?: string;
  sdrName?: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient
  ) {}

  /**
   * Handle inbound call from Sabrina SMS campaign
   * Looks up the SDR persona who sent the original SMS for custom voicemail
   */
  async handleInboundCall(
    fromPhone: string,
    toPhone: string,
    callSid: string
  ): Promise<InboundCallResult> {
    this.logger.log(`Inbound call from ${fromPhone} to ${toPhone}`);

    // 1. Find the lead by phone
    const lead = await this.db.query.leads.findFirst({
      where: eq(leadsTable.phone, fromPhone),
    });

    // 2. Get team config for calendar URL
    let calendarUrl = "https://calendly.com"; // Default fallback
    let teamId: string | undefined;
    let sdrName: string | undefined;
    let sdrVoicemailUrl: string | undefined;

    if (lead?.teamId) {
      teamId = lead.teamId;
      const team = await this.db.query.teams.findFirst({
        where: eq(teamsTable.id, lead.teamId),
      });
      // Team could have custom calendar URL in settings
      calendarUrl = (team as any)?.calendarUrl || calendarUrl;
    }

    // 3. Look up the SDR who contacted this lead (from their campaign)
    if (lead?.campaignId) {
      const campaign = await this.db.query.campaigns.findFirst({
        where: eq(campaignsTable.id, lead.campaignId),
      });

      if (campaign?.sdrId) {
        const sdr = await this.db.query.aiSdrAvatars.findFirst({
          where: eq(aiSdrAvatarsTable.id, campaign.sdrId),
        });

        if (sdr) {
          sdrName = sdr.name;
          // SDR voicemail recording URL (stored in avatar settings)
          sdrVoicemailUrl = (sdr as any)?.voicemailUrl;
          this.logger.log(`Found SDR ${sdrName} for callback routing`);
        }
      }
    }

    // 4. Log the call attempt to inbox
    await this.logCallAttempt(fromPhone, lead?.id, teamId, callSid);

    // 5. Send follow-up SMS with calendar link
    const smsSent = await this.sendCalendarSms(fromPhone, calendarUrl, lead?.firstName);

    return {
      leadId: lead?.id,
      leadName: lead?.name,
      teamId,
      calendarUrl,
      voicemailPlayed: true,
      smsSent,
      sdrName,
      sdrVoicemailUrl,
    };
  }

  /**
   * Generate TwiML for voicemail response
   * Supports custom recordings from SDR persona or falls back to TTS
   */
  generateVoicemailTwiml(config: VoicemailConfig): string {
    // If SDR has a custom recording, play it instead of TTS
    if (config.recordingUrl) {
      this.logger.log(`Playing custom recording from ${config.sdrName || 'SDR'}: ${config.recordingUrl}`);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${config.recordingUrl}</Play>
  <Hangup/>
</Response>`;
    }

    // Fallback to TTS with Silvana (Italian accent)
    const greeting = config.greeting ||
      "Thanks for calling back! We'd love to connect with you. " +
      "Check your text messages for a link to schedule a time that works best for you. " +
      "We look forward to speaking with you soon!";

    // Silvana - Italian female voice (Polly.Carla) for warm Italian accent
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Carla" language="en-US">
    ${greeting}
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Carla" language="en-US">
    Arrivederci!
  </Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Log call attempt to inbox for tracking
   */
  private async logCallAttempt(
    fromPhone: string,
    leadId?: string,
    teamId?: string,
    callSid?: string
  ) {
    if (!teamId) {
      this.logger.warn(`No team found for call from ${fromPhone}`);
      return;
    }

    try {
      await this.db.insert(inboxItemsTable).values({
        teamId,
        leadId,
        phoneNumber: fromPhone,
        responseText: `[INBOUND CALL] Lead called back - voicemail played, calendar SMS sent`,
        classification: ResponseClassification.POSITIVE,
        priority: InboxPriority.HOT,
        priorityScore: 85,
        currentBucket: BucketType.POSITIVE_RESPONSES,
        intent: "callback",
        sentiment: "positive",
        metadata: {
          type: "inbound_call",
          callSid,
          action: "voicemail_calendar_sms",
        },
      });

      this.logger.log(`Logged inbound call from ${fromPhone} to inbox`);
    } catch (error) {
      this.logger.error(`Failed to log call attempt: ${error}`);
    }
  }

  /**
   * Send SMS with calendar booking link
   */
  private async sendCalendarSms(
    toPhone: string,
    calendarUrl: string,
    firstName?: string | null
  ): Promise<boolean> {
    const accountSid = this.configService.get("SIGNALHOUSE_ACCOUNT_SID") ||
                       this.configService.get("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get("SIGNALHOUSE_AUTH_TOKEN") ||
                      this.configService.get("TWILIO_AUTH_TOKEN");
    const fromPhone = this.configService.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromPhone) {
      this.logger.warn("SMS credentials not configured");
      return false;
    }

    const greeting = firstName ? `Hi ${firstName}!` : "Hi!";
    const message = `${greeting} Thanks for calling us back. Book a time to chat here: ${calendarUrl}`;

    try {
      // Use SignalHouse/Twilio API to send SMS
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: toPhone,
            From: fromPhone,
            Body: message,
          }),
        }
      );

      if (response.ok) {
        this.logger.log(`Sent calendar SMS to ${toPhone}`);
        return true;
      } else {
        const error = await response.text();
        this.logger.error(`Failed to send SMS: ${error}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`SMS send error: ${error}`);
      return false;
    }
  }
}
