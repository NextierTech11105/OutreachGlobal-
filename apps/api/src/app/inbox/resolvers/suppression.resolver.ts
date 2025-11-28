import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { SuppressionEntry, SuppressionEntryConnection } from "../models/suppression-entry.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { InboxService } from "../services/inbox.service";
import { User } from "@/app/user/models/user.model";
import {
  SuppressionConnectionArgs,
  CreateSuppressionArgs,
  RemoveSuppressionArgs,
} from "../args/inbox.args";
import {
  CreateSuppressionPayload,
  RemoveSuppressionPayload,
} from "../objects/inbox.object";

@Resolver(() => SuppressionEntry)
@UseAuthGuard()
export class SuppressionResolver extends BaseResolver(SuppressionEntry) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: InboxService,
  ) {
    super();
  }

  @Query(() => SuppressionEntryConnection)
  async suppressionList(@Auth() user: User, @Args() args: SuppressionConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getSuppressionList(team.id, args.type, args.searchQuery);
  }

  @Mutation(() => CreateSuppressionPayload)
  async createSuppressionEntry(
    @Auth() user: User,
    @Args() args: CreateSuppressionArgs
  ): Promise<CreateSuppressionPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.addToSuppressionList(
      team.id,
      args.input.phoneNumber,
      args.input.type,
      args.input.reason,
      args.input.sourceInboxItemId
    );
  }

  @Mutation(() => RemoveSuppressionPayload)
  async removeSuppressionEntry(
    @Auth() user: User,
    @Args() args: RemoveSuppressionArgs
  ): Promise<RemoveSuppressionPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.removeFromSuppressionList(team.id, args.id);
  }
}
