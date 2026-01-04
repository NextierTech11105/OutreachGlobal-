import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { TeamPolicy } from "../policies/team.policy";
import { BaseTeamArgs } from "../args/team.args";
import { User } from "@/app/user/models/user.model";
import {
  SignalHouseSettings,
  UpdateSignalHouseSettingsPayload,
} from "../objects/signalhouse-settings.object";
import { SignalHouseSettingsInput } from "../inputs/signalhouse-settings.input";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { teams } from "@/database/schema";
import { eq } from "drizzle-orm";
import { ArgsType, Field } from "@nestjs/graphql";
import { IdField } from "@/app/apollo/decorators";

@ArgsType()
class UpdateSignalHouseSettingsArgs extends BaseTeamArgs {
  @Field(() => SignalHouseSettingsInput)
  input: SignalHouseSettingsInput;
}

@Resolver(() => SignalHouseSettings)
@UseAuthGuard()
export class SignalHouseSettingsResolver extends BaseResolver(SignalHouseSettings) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => SignalHouseSettings)
  async signalHouseSettings(@Auth() user: User, @Args() args: BaseTeamArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return {
      subGroupId: team.signalhouseSubGroupId,
      brandId: team.signalhouseBrandId,
      campaignIds: team.signalhouseCampaignIds,
      phonePool: team.signalhousePhonePool,
    };
  }

  @Mutation(() => UpdateSignalHouseSettingsPayload)
  async updateSignalHouseSettings(
    @Auth() user: User,
    @Args() args: UpdateSignalHouseSettingsArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    const { input } = args;

    await this.db
      .update(teams)
      .set({
        signalhouseSubGroupId: input.subGroupId ?? team.signalhouseSubGroupId,
        signalhouseBrandId: input.brandId ?? team.signalhouseBrandId,
        signalhouseCampaignIds: input.campaignIds ?? team.signalhouseCampaignIds,
        signalhousePhonePool: input.phonePool ?? team.signalhousePhonePool,
      })
      .where(eq(teams.id, team.id));

    const updatedTeam = await this.teamService.findById(team.id);

    return {
      settings: {
        subGroupId: updatedTeam.signalhouseSubGroupId,
        brandId: updatedTeam.signalhouseBrandId,
        campaignIds: updatedTeam.signalhouseCampaignIds,
        phonePool: updatedTeam.signalhousePhonePool,
      },
    };
  }
}
