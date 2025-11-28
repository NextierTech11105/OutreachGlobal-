import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseController } from "@/app/base.controller";
import { TwilioSettings } from "@/app/team/objects/twilio-settings.object";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import { TeamService } from "@/app/team/services/team.service";
import { User } from "@/app/user/models/user.model";
import { TwilioService } from "@/lib/twilio/twilio.service";
import { Body, Controller, Header, Param, Post } from "@nestjs/common";
import Twilio from "twilio";

@Controller("rest/voice")
export class VoiceController extends BaseController {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private twilioService: TwilioService,
    private setting: TeamSettingService,
  ) {
    super();
  }

  @Post()
  @Header("Content-Type", "text/xml")
  async voice(@Body() body: any) {
    console.log("received webhook for voice", body);
    const twiml = new Twilio.twiml.VoiceResponse();
    if (!body?.To) {
      twiml.say("Sorry, we could not complete your call. Please try again.");
    } else {
      const [client, callerId] = body.Caller.split(":");
      twiml.dial({ callerId }, body.To);
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
