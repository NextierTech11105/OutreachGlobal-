import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  TwilioSettings,
  UpdateTwilioSettingsPayload,
} from "../objects/twilio-settings.object";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { TeamPolicy } from "../policies/team.policy";
import { TeamSettingService } from "../services/team-setting.service";
import { BaseTeamArgs } from "../args/team.args";
import { User } from "@/app/user/models/user.model";
import {
  TestTwilioSendSmsArgs,
  UpdateTwilioSettingsArgs,
} from "../args/team-settings.args";
import { twilioSettingsSchema } from "@nextier/dto";
import { z } from "zod/v4";
import { TwilioService } from "@/lib/twilio/twilio.service";

@Resolver(() => TwilioSettings)
@UseAuthGuard()
export class TwilioSettingsResolver extends BaseResolver(TwilioSettings) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private settingService: TeamSettingService,
    private twilioService: TwilioService,
  ) {
    super();
  }

  @Query(() => TwilioSettings)
  async twilioSettings(@Auth() user: User, @Args() args: BaseTeamArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const settings = await this.settingService.getMapped(args.teamId, "twilio");
    return settings;
  }

  @Mutation(() => UpdateTwilioSettingsPayload)
  async updateTwilioSettings(
    @Auth() user: User,
    @Args() args: UpdateTwilioSettingsArgs,
  ) {
    const input = this.validate(twilioSettingsSchema, args.input);
    const schema = z.toJSONSchema(twilioSettingsSchema);

    const values = this.settingService.buildValues(schema, input);

    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    const settings = await this.settingService.upsert(
      args.teamId,
      "twilio",
      values,
    );
    return { settings };
  }

  @Mutation(() => Boolean)
  async testTwilioSendSms(
    @Auth() user: User,
    @Args() args: TestTwilioSendSmsArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const settings = await this.settingService.getMapped<TwilioSettings>(
      args.teamId,
      "twilio",
    );
    await this.twilioService.testConnection({
      accountSid: settings.twilioAccountSid,
      authToken: settings.twilioAuthToken,
    });
    return true;
  }
}
