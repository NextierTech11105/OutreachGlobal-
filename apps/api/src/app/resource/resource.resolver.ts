import { Args, Query, Resolver } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { User } from "@/app/user/models/user.model";
import { Resource, ResourceConnection } from "./resource.object";
import { BaseResolver } from "../apollo/base.resolver";
import { TeamService } from "../team/services/team.service";
import { TeamPolicy } from "../team/policies/team.policy";
import { ResourceService } from "./resource.service";
import { ResourceConnectionArgs } from "./resource.args";

@Resolver(() => Resource)
@UseAuthGuard()
export class ResourceResolver extends BaseResolver(Resource) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: ResourceService,
  ) {
    super();
  }

  @Query(() => ResourceConnection)
  async resources(@Auth() user: User, @Args() args: ResourceConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }
}
