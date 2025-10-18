import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { TeamMember, TeamMemberConnection } from "../models/team-member.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { TeamPolicy } from "../policies/team.policy";
import { User } from "@/app/user/models/user.model";
import {
  RemoveTeamMemberArgs,
  TeamMemberConnectionArgs,
} from "../args/team-member.args";
import { TeamMemberService } from "../services/team-member.service";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";

@Resolver(() => TeamMember)
@UseAuthGuard()
export class TeamMemberResolver extends BaseResolver(TeamMember) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: TeamMemberService,
  ) {
    super();
  }

  @Query(() => TeamMemberConnection)
  async teamMembers(
    @Auth() user: User,
    @Args() args: TeamMemberConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => Boolean)
  async removeTeamMember(
    @Auth() user: User,
    @Args() args: RemoveTeamMemberArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    await this.service.remove({
      memberId: args.memberId,
      teamId: team.id,
    });
    return true;
  }

  @ResolveField(() => User, { nullable: true })
  async user(
    @Parent() parent: TeamMember,
    @Context("loaders") loaders: Dataloaders,
  ) {
    if (parent.userId) {
      return loaders.user.load(parent.userId);
    }
    return null;
  }
}
