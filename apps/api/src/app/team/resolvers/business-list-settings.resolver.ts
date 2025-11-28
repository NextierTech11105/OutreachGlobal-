import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  BusinessListSettings,
  UpsertBusinessListSettingsPayload,
} from "../objects/business-list-settings.object";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { TeamPolicy } from "../policies/team.policy";
import { TeamSettingService } from "../services/team-setting.service";
import { BaseTeamArgs } from "../args/team.args";
import { User } from "@/app/user/models/user.model";
import { UpsertBusinessListSettingsArgs } from "../args/business-list-settings.args";
import { upsertBusinessListSettingsSchema } from "@nextier/dto";
import { z } from "@nextier/dto";

@Resolver(() => BusinessListSettings)
@UseAuthGuard()
export class BusinessListSettingsResolver extends BaseResolver(
  BusinessListSettings,
) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: TeamSettingService,
  ) {
    super();
  }

  @Query(() => BusinessListSettings)
  async businessListSettings(@Auth() user: User, @Args() args: BaseTeamArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const settings = await this.service.getMapped(args.teamId, "business-list");
    return settings;
  }

  @Mutation(() => UpsertBusinessListSettingsPayload)
  async upsertBusinessListSettings(
    @Auth() user: User,
    @Args() args: UpsertBusinessListSettingsArgs,
  ) {
    const input = this.validate(upsertBusinessListSettingsSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const schema = z.toJSONSchema(upsertBusinessListSettingsSchema);
    const values = this.service.buildValues(schema, input);
    const settings = await this.service.upsert(
      args.teamId,
      "business-list",
      values,
    );
    return { settings };
  }
}
