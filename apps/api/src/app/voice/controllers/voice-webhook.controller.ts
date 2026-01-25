import {
  Controller,
  Post,
  Body,
  Res,
  Header,
  Get,
  Query,
  Logger,
  Headers,
  Req,
  RawBodyRequest,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { VoiceService } from "../services/voice.service";
import { ConfigService } from "@nestjs/config";
import { validateRequest } from "twilio";

interface TwilioVoiceWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ApiVersion?: string;
  Caller?: string;
  Called?: string;
}

@Controller("webhook/voice")
export class VoiceWebhookController {
  private readonly logger = new Logger(VoiceWebhookController.name);

  constructor(
    private voiceService: VoiceService,
    private configService: ConfigService,
  ) {}

  /**
   * Validate Twilio webhook signature to prevent spoofed requests.
   * Returns true if signature is valid or if in local dev mode.
   */
  private validateTwilioSignature(
    signature: string | undefined,
    url: string,
    params: Record<string, string>,
  ): boolean {
    // Skip validation in local development
    if (this.configService.get("APP_ENV") === "local") {
      return true;
    }

    if (!signature) {
      this.logger.warn("Missing X-Twilio-Signature header");
      return false;
    }

    const authToken = this.configService.get("TWILIO_AUTH_TOKEN");
    if (!authToken) {
      this.logger.error("TWILIO_AUTH_TOKEN not configured");
      return false;
    }

    const isValid = validateRequest(authToken, signature, url, params);
    if (!isValid) {
      this.logger.warn(`Invalid Twilio signature for URL: ${url}`);
    }
    return isValid;
  }

  /**
   * Handle incoming voice calls from SignalHouse/Twilio
   * This is the endpoint you configure as your Voice URL in Twilio/SignalHouse
   *
   * Flow:
   * 1. Lead receives SMS from Sabrina
   * 2. Lead calls back the number
   * 3. This webhook is triggered
   * 4. We play voicemail + send calendar SMS
   * 5. Lead is tracked as HOT in inbox
   */
  @Post("inbound")
  @Header("Content-Type", "application/xml")
  async handleInboundCall(
    @Body() body: TwilioVoiceWebhook,
    @Headers("x-twilio-signature") signature: string | undefined,
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Res() res: FastifyReply,
  ) {
    // Validate Twilio signature to prevent spoofed webhooks
    const webhookUrl = `${this.configService.get("API_URL") || "https://api.nextier.ai"}/webhook/voice/inbound`;
    const isValid = this.validateTwilioSignature(signature, webhookUrl, body as unknown as Record<string, string>);
    if (!isValid) {
      this.logger.warn("Rejected inbound call webhook: invalid signature");
      return res.status(403).send("Forbidden: Invalid signature");
    }

    const { CallSid, From, To, CallStatus, Direction } = body;

    this.logger.log(
      `Inbound call from ${From} to ${To}, status: ${CallStatus}`,
    );

    // Only handle incoming calls
    if (Direction !== "inbound") {
      return res.status(200).send(this.getHangupTwiml());
    }

    try {
      // Process the call - logs to inbox, sends calendar SMS
      const result = await this.voiceService.handleInboundCall(
        From,
        To,
        CallSid,
      );

      this.logger.log(
        `Call processed - Lead: ${result.leadName || "Unknown"}, SDR: ${result.sdrName || "Default"}, SMS Sent: ${result.smsSent}`,
      );

      // Get custom greeting from config or use default
      const calendarUrl =
        this.configService.get("CALENDAR_URL") ||
        "https://calendly.com/your-team";

      // If SDR has custom recording, use it - otherwise fall back to TTS
      const greeting = result.sdrName
        ? `Hi${result.leadName ? ` ${result.leadName.split(" ")[0]}` : ""}! This is ${result.sdrName}. Thanks for calling back.`
        : result.leadName
          ? `Hi ${result.leadName.split(" ")[0]}! Thanks for calling back.`
          : "Thanks for calling back!";

      const voicemailTwiml = this.voiceService.generateVoicemailTwiml({
        greeting: `${greeting} We'd love to connect with you. Check your text messages for a link to schedule a time that works best for you. We look forward to speaking with you soon!`,
        calendarUrl,
        smsFollowUp: true,
        // Pass SDR's custom recording if available
        recordingUrl: result.sdrVoicemailUrl,
        sdrName: result.sdrName,
      });

      return res.status(200).send(voicemailTwiml);
    } catch (error: any) {
      this.logger.error(`Call error: ${error.message}`, error.stack);
      return res.status(200).send(this.getErrorTwiml());
    }
  }

  /**
   * Handle call status updates (completed, busy, no-answer, failed)
   */
  @Post("status")
  async handleStatusCallback(
    @Body() body: TwilioVoiceWebhook,
    @Headers("x-twilio-signature") signature: string | undefined,
  ) {
    // Validate Twilio signature
    const webhookUrl = `${this.configService.get("API_URL") || "https://api.nextier.ai"}/webhook/voice/status`;
    const isValid = this.validateTwilioSignature(signature, webhookUrl, body as unknown as Record<string, string>);
    if (!isValid) {
      this.logger.warn("Rejected status callback: invalid signature");
      return { error: "Invalid signature", received: false };
    }

    const { CallSid, CallStatus, From, To } = body;
    this.logger.log(`Call status ${CallSid}: ${CallStatus} (${From} -> ${To})`);
    return { received: true };
  }

  /**
   * Fallback endpoint for testing
   */
  @Get("test")
  async testVoicemail(@Query("name") name?: string) {
    const calendarUrl =
      this.configService.get("CALENDAR_URL") ||
      "https://calendly.com/your-team";

    const greeting = name
      ? `Hi ${name}! Thanks for calling back.`
      : "Thanks for calling back!";

    return this.voiceService.generateVoicemailTwiml({
      greeting: `${greeting} We'd love to connect with you. Check your text messages for a link to schedule a time that works best for you.`,
      calendarUrl,
      smsFollowUp: true,
    });
  }

  private getHangupTwiml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
  }

  private getErrorTwiml(): string {
    // Silvana - Italian female voice
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Carla">
    Mi scusi, we are experiencing technical difficulties. Please try again later.
  </Say>
  <Hangup/>
</Response>`;
  }
}
