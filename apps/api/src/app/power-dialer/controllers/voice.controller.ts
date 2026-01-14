import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseController } from "@/app/base.controller";
import { TwilioSettings } from "@/app/team/objects/twilio-settings.object";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import { TeamService } from "@/app/team/services/team.service";
import { User } from "@/app/user/models/user.model";
import { TwilioService } from "@/lib/twilio/twilio.service";
import { Body, Controller, Header, Logger, Param, Post } from "@nestjs/common";
import Twilio from "twilio";

@Controller("rest/voice")
export class VoiceController extends BaseController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private twilioService: TwilioService,
    private setting: TeamSettingService,
  ) {
    super();
  }

  /**
   * Twilio Voice Webhook - handles outbound call initiation
   * Note: This endpoint is called by Twilio, not by users directly
   */
  @Post()
  @Header("Content-Type", "text/xml")
  async voice(@Body() body: any) {
    this.logger.log("Received voice webhook", {
      to: body?.To,
      caller: body?.Caller,
    });
    const twiml = new Twilio.twiml.VoiceResponse();

    try {
      if (!body?.To) {
        twiml.say("Sorry, we could not complete your call. Please try again.");
      } else if (!body?.Caller || !body.Caller.includes(":")) {
        this.logger.warn("Invalid Caller format in voice webhook", {
          caller: body?.Caller,
        });
        twiml.say(
          "Sorry, invalid caller configuration. Please contact support.",
        );
      } else {
        const [client, callerId] = body.Caller.split(":");
        twiml.dial({ callerId: callerId || client }, body.To);
      }
    } catch (error: any) {
      this.logger.error("Error processing voice webhook", {
        error: error.message,
        stack: error.stack,
      });
      twiml.say("Sorry, an error occurred. Please try again.");
    }

    return twiml.toString();
  }

  @Post("/:teamId/token")
  @UseAuthGuard()
  async createVoiceGrant(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);
    const settings = await this.setting.getMapped<TwilioSettings>(
      teamId,
      "twilio",
    );

    const token = this.twilioService.createVoiceGrant({
      accountSid: settings.twilioAccountSid,
      twiMLAppSid: settings.twiMLAppSid,
      identity: settings.twilioDefaultPhoneNumber as string,
      apiKey: settings.twilioApiKey,
      apiSecret: settings.twilioApiSecret,
    });

    return {
      token,
    };
  }
}
