import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { InboxItem, InboxItemConnection } from "../models/inbox-item.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { InboxService } from "../services/inbox.service";
import { SabrinaSdrService } from "../services/sabrina-sdr.service";
import { User } from "@/app/user/models/user.model";
import {
  InboxItemConnectionArgs,
  FindOneInboxItemArgs,
  ProcessInboxItemArgs,
  MoveInboxItemArgs,
  UpdateInboxItemArgs,
  BulkMoveInboxItemsArgs,
  BucketStatsArgs,
} from "../args/inbox.args";
import {
  ProcessInboxItemPayload,
  MoveInboxItemPayload,
  UpdateInboxItemPayload,
  BulkMoveInboxItemsPayload,
  InboxStats,
} from "../objects/inbox.object";
import { ResponseBucket } from "../models/response-bucket.model";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";
import { Lead } from "@/app/lead/models/lead.model";

@Resolver(() => InboxItem)
@UseAuthGuard()
export class InboxResolver extends BaseResolver(InboxItem) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: InboxService,
    private sabrinaService: SabrinaSdrService,
  ) {
    super();
  }

  @Query(() => InboxItemConnection)
  async inboxItems(@Auth() user: User, @Args() args: InboxItemConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Query(() => InboxItem)
  async inboxItem(@Auth() user: User, @Args() args: FindOneInboxItemArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail(team.id, args.id);
  }

  @Query(() => InboxStats)
  async inboxStats(@Auth() user: User, @Args() args: BucketStatsArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getInboxStats(team.id);
  }

  @Query(() => [ResponseBucket])
  async responseBuckets(@Auth() user: User, @Args() args: BucketStatsArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getResponseBuckets(team.id);
  }

  @Mutation(() => ProcessInboxItemPayload)
  async processInboxItem(
    @Auth() user: User,
    @Args() args: ProcessInboxItemArgs
  ): Promise<ProcessInboxItemPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.processItem(team.id, args.id, user.id, args.input);
  }

  @Mutation(() => MoveInboxItemPayload)
  async moveInboxItem(
    @Auth() user: User,
    @Args() args: MoveInboxItemArgs
  ): Promise<MoveInboxItemPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.moveToBucket(
      team.id,
      args.id,
      args.input.targetBucket,
      user.id,
      args.input.reason
    );
  }

  @Mutation(() => UpdateInboxItemPayload)
  async updateInboxItem(
    @Auth() user: User,
    @Args() args: UpdateInboxItemArgs
  ): Promise<UpdateInboxItemPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.update(team.id, args.id, args.input);
  }

  @Mutation(() => BulkMoveInboxItemsPayload)
  async bulkMoveInboxItems(
    @Auth() user: User,
    @Args() args: BulkMoveInboxItemsArgs
  ): Promise<BulkMoveInboxItemsPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.bulkMove(
      team.id,
      args.itemIds,
      args.input.targetBucket,
      user.id,
      args.input.reason
    );
  }

  @Mutation(() => [ResponseBucket])
  async initializeResponseBuckets(@Auth() user: User, @Args() args: BucketStatsArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.initializeDefaultBuckets(team.id);
  }

  @ResolveField(() => Lead, { nullable: true })
  lead(@Parent() item: InboxItem, @Context("loaders") loaders: Dataloaders) {
    if (!item.leadId) return null;
    return loaders.lead.load(item.leadId);
  }
}
