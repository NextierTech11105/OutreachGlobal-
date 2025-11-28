import { Args, Query, Resolver } from "@nestjs/graphql";
import { Facet, FacetResults } from "../objects/facet.object";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { SearchFacetsArgs } from "../args/facet.args";
import { BusinessListService } from "../services/business-list.service";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import { User } from "@/app/user/models/user.model";
import { BusinessListSettings } from "@/app/team/objects/business-list-settings.object";

@Resolver(() => Facet)
@UseAuthGuard()
export class FacetResolver extends BaseResolver(Facet) {
  constructor(
    private businessListService: BusinessListService,
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private settingService: TeamSettingService,
  ) {
    super();
  }

  @Query(() => FacetResults)
  async searchFacets(@Auth() user: User, @Args() args: SearchFacetsArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const settings = await this.settingService.getMapped<BusinessListSettings>(
      team.id,
      "business-list",
    );
    if (!settings.businessListApiToken) {
      throw new Error("Business list api token is not set");
    }
    return this.businessListService.searchFacets({
      ...args,
      token: settings.businessListApiToken,
    });
  }
}
