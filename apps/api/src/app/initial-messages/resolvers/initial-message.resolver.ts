import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { InitialMessage, InitialMessageConnection } from "../models/initial-message.model";
import { CampaignInitialMessage } from "../models/campaign-initial-message.model";
import { SdrCampaignConfig } from "../models/sdr-campaign-config.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { InitialMessageService } from "../services/initial-message.service";
import { User } from "@/app/user/models/user.model";
import {
  InitialMessageConnectionArgs,
  FindOneInitialMessageArgs,
  CreateInitialMessageArgs,
  UpdateInitialMessageArgs,
  DeleteInitialMessageArgs,
  CreateMessageVariantArgs,
  AssignMessageToCampaignArgs,
  RemoveMessageFromCampaignArgs,
  CampaignMessagesArgs,
  SdrCampaignConfigArgs,
  UpdateSdrCampaignConfigArgs,
  MessageCategoriesArgs,
  TopPerformingMessagesArgs,
} from "../args/initial-message.args";
import {
  CreateInitialMessagePayload,
  UpdateInitialMessagePayload,
  DeleteInitialMessagePayload,
  AssignMessageToCampaignPayload,
  RemoveMessageFromCampaignPayload,
  UpdateSdrCampaignConfigPayload,
  MessageCategoryStats,
  MessagePerformance,
  PersonalizationToken,
} from "../objects/initial-message.object";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";

@Resolver(() => InitialMessage)
@UseAuthGuard()
export class InitialMessageResolver extends BaseResolver(InitialMessage) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: InitialMessageService,
  ) {
    super();
  }

  @Query(() => InitialMessageConnection)
  async initialMessages(@Auth() user: User, @Args() args: InitialMessageConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      searchQuery: args.searchQuery ?? undefined,
      teamId: team.id,
    });
  }

  @Query(() => InitialMessage)
  async initialMessage(@Auth() user: User, @Args() args: FindOneInitialMessageArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail(team.id, args.id);
  }

  @Query(() => [CampaignInitialMessage])
  async campaignInitialMessages(@Auth() user: User, @Args() args: CampaignMessagesArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getCampaignMessages(args.campaignId);
  }

  @Query(() => SdrCampaignConfig)
  async sdrCampaignConfig(@Auth() user: User, @Args() args: SdrCampaignConfigArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getOrCreateSdrConfig(team.id, args.sdrId, args.campaignId);
  }

  @Query(() => [MessageCategoryStats])
  async messageCategoryStats(@Auth() user: User, @Args() args: MessageCategoriesArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getCategoryStats(team.id);
  }

  @Query(() => [MessagePerformance])
  async topPerformingMessages(@Auth() user: User, @Args() args: TopPerformingMessagesArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getTopPerforming(team.id, args.category);
  }

  @Query(() => [PersonalizationToken])
  personalizationTokens() {
    return this.service.getPersonalizationTokens();
  }

  @Mutation(() => CreateInitialMessagePayload)
  async createInitialMessage(
    @Auth() user: User,
    @Args() args: CreateInitialMessageArgs
  ): Promise<CreateInitialMessagePayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.create(team.id, {
      ...args.input,
      description: args.input.description ?? undefined,
      defaultSdrId: args.input.defaultSdrId ?? undefined,
    });
  }

  @Mutation(() => UpdateInitialMessagePayload)
  async updateInitialMessage(
    @Auth() user: User,
    @Args() args: UpdateInitialMessageArgs
  ): Promise<UpdateInitialMessagePayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.update(team.id, args.id, args.input);
  }

  @Mutation(() => DeleteInitialMessagePayload)
  async deleteInitialMessage(
    @Auth() user: User,
    @Args() args: DeleteInitialMessageArgs
  ): Promise<DeleteInitialMessagePayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.delete(team.id, args.id);
  }

  @Mutation(() => CreateInitialMessagePayload)
  async createMessageVariant(
    @Auth() user: User,
    @Args() args: CreateMessageVariantArgs
  ): Promise<CreateInitialMessagePayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.createVariant(
      team.id,
      args.input.parentMessageId,
      args.input.variantName,
      args.input.content
    );
  }

  @Mutation(() => AssignMessageToCampaignPayload)
  async assignMessageToCampaign(
    @Auth() user: User,
    @Args() args: AssignMessageToCampaignArgs
  ): Promise<AssignMessageToCampaignPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.assignToCampaign(
      team.id,
      args.input.campaignId,
      args.input.initialMessageId,
      {
        assignedSdrId: args.input.assignedSdrId || undefined,
        position: args.input.position,
        weight: args.input.weight,
      }
    );
  }

  @Mutation(() => RemoveMessageFromCampaignPayload)
  async removeMessageFromCampaign(
    @Auth() user: User,
    @Args() args: RemoveMessageFromCampaignArgs
  ): Promise<RemoveMessageFromCampaignPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.removeFromCampaign(args.campaignId, args.initialMessageId);
  }

  @Mutation(() => UpdateSdrCampaignConfigPayload)
  async updateSdrCampaignConfig(
    @Auth() user: User,
    @Args() args: UpdateSdrCampaignConfigArgs
  ): Promise<UpdateSdrCampaignConfigPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.updateSdrConfig(team.id, args.sdrId, args.campaignId, args.input);
  }

  @ResolveField(() => [InitialMessage])
  async variants(@Parent() message: InitialMessage) {
    if (!message.id) return [];
    // Would need to query variants where parentMessageId = message.id
    return [];
  }
}
