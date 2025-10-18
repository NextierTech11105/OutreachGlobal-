import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { TeamPolicy } from "../policies/team.policy";
import { TeamSettingService } from "../services/team-setting.service";
import { BaseTeamArgs } from "../args/team.args";
import { User } from "@/app/user/models/user.model";
import {
  SendgridSettings,
  UpdateSendgridSettingsPayload,
} from "../objects/sendgrid-settings.object";
import {
  TestSendgridSendEmailArgs,
  UpdateSendgridSettingsArgs,
} from "../args/team-settings.args";
import { sendgridSettingsSchema, z } from "@nextier/dto";
import { SendgridService } from "../services/sendgrid.service";

@Resolver(() => SendgridSettings)
@UseAuthGuard()
export class SendgridSettingsResolver extends BaseResolver(SendgridSettings) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private settingService: TeamSettingService,
    private sendgridService: SendgridService,
  ) {
    super();
  }

  @Query(() => SendgridSettings)
  async sendgridSettings(@Auth() user: User, @Args() args: BaseTeamArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const settings = await this.settingService.getMapped(
      args.teamId,
      "sendgrid",
    );
    return settings;
  }

  @Mutation(() => UpdateSendgridSettingsPayload)
  async updateSendgridSettings(
    @Auth() user: User,
    @Args() args: UpdateSendgridSettingsArgs,
  ) {
    const input = this.validate(sendgridSettingsSchema, args.input);
    const schema = z.toJSONSchema(sendgridSettingsSchema);

    const values = this.settingService.buildValues(schema, input);

    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    const settings = await this.settingService.upsert(
      args.teamId,
      "sendgrid",
      values,
    );
    return { settings };
  }

  @Mutation(() => Boolean)
  async testSendgridSendEmail(
    @Auth() user: User,
    @Args() args: TestSendgridSendEmailArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    const settings = await this.settingService.getMapped<SendgridSettings>(
      args.teamId,
      "sendgrid",
    );
    await this.sendgridService.send({
      apiKey: settings.sendgridApiKey,
      data: {
        from: settings.sendgridFromEmail || "",
        to: args.email,
        subject: "Test Sendgrid Send Email",
        text: "This is a test email sent from Sendgrid",
      },
    });
    return true;
  }
}
