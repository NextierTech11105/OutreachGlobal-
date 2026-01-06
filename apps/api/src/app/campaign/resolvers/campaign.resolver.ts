import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Campaign, CampaignConnection } from "../models/campaign.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import {
  CreateCampaignArgs,
  DeleteCampaignArgs,
  FindOneCampaignArgs,
  CampaignConnectionArgs,
  UpdateCampaignArgs,
  ToggleCampaignStatusArgs,
} from "../args/campaign.args";
import { CampaignService } from "../services/campaign.service";
import {
  CreateCampaignPayload,
  DeleteCampaignPayload,
  ToggleCampaignStatusPayload,
  UpdateCampaignPayload,
} from "../objects/campaign.object";
import { campaignSchema } from "@nextier/dto";
import { AiSdrAvatar } from "@/app/sdr/models/ai-sdr-avatar.model";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";
import { CampaignSequence } from "../models/campaign-sequence.model";
import { CampaignExecutionConnection } from "../models/campaign-execution.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { DatabaseService } from "@/database/services/database.service";
import {
  campaignExecutionsTable,
  campaignLeadsTable,
} from "@/database/schema-alias";
import { and, eq } from "drizzle-orm";
import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { CampaignLeadConnection } from "../models/campaign-lead.model";

@Resolver(() => Campaign)
@UseAuthGuard()
export class CampaignResolver extends BaseResolver(Campaign) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: CampaignService,
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {
    super();
  }

  @Query(() => CampaignConnection)
  async campaigns(@Auth() user: User, @Args() args: CampaignConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Query(() => Campaign)
  async campaign(@Auth() user: User, @Args() args: FindOneCampaignArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail({
      id: args.id,
      teamId: team.id,
    });
  }

  @Mutation(() => CreateCampaignPayload)
  async createCampaign(
    @Auth() user: User,
    @Args() args: CreateCampaignArgs,
  ): Promise<CreateCampaignPayload> {
    const input = this.validate(campaignSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team); // ADMIN/OWNER only - prevents budget drain
    return this.service.create({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => UpdateCampaignPayload)
  async updateCampaign(
    @Auth() user: User,
    @Args() args: UpdateCampaignArgs,
  ): Promise<UpdateCampaignPayload> {
    const input = this.validate(campaignSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team); // ADMIN/OWNER only
    return this.service.update({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => DeleteCampaignPayload)
  async deleteCampaign(
    @Auth() user: User,
    @Args() args: DeleteCampaignArgs,
  ): Promise<DeleteCampaignPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team); // ADMIN/OWNER only
    return this.service.remove({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => ToggleCampaignStatusPayload)
  async toggleCampaignStatus(
    @Auth() user: User,
    @Args() args: ToggleCampaignStatusArgs,
  ): Promise<ToggleCampaignStatusPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team); // ADMIN/OWNER only - controls campaign activation
    return this.service.toggle(args);
  }

  @ResolveField(() => AiSdrAvatar, { nullable: true })
  aiSdrAvatar(
    @Parent() campaign: Campaign,
    @Context("loaders") loaders: Dataloaders,
  ) {
    if (!campaign.sdrId) {
      return null;
    }
    return loaders.aiSdrAvatar.load(campaign.sdrId);
  }

  @ResolveField(() => [CampaignSequence])
  sequences(
    @Parent() campaign: Campaign,
    @Context("loaders") loaders: Dataloaders,
  ) {
    return loaders.campaignSequences.load(campaign.id);
  }

  @ResolveField(() => CampaignExecutionConnection)
  async executions(@Parent() campaign: Campaign, @Args() args: PageInfoArgs) {
    const query = this.db
      .select()
      .from(campaignExecutionsTable)
      .where((t) => and(eq(t.campaignId, campaign.id)))
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...args,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  @ResolveField(() => CampaignLeadConnection)
  async campaignLeads(
    @Parent() campaign: Campaign,
    @Args() args: PageInfoArgs,
  ) {
    const query = this.db
      .select()
      .from(campaignLeadsTable)
      .where((t) => and(eq(t.campaignId, campaign.id)))
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...args,
      cursors: (t) => [getCursorOrder(t.leadId, true)],
    });
  }
}
