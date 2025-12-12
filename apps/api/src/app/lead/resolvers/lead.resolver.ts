import {
  Args,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Mutation,
  Context,
} from "@nestjs/graphql";
import { Lead, LeadConnection } from "../models/lead.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { LeadService } from "../services/lead.service";
import { User } from "@/app/user/models/user.model";
import {
  FindManyLeadStatusesArgs,
  LeadConnectionArgs,
  LeadsCountArgs,
  FindOneLeadArgs,
  CreateLeadArgs,
  UpdateLeadArgs,
  DeleteLeadArgs,
  BulkDeleteLeadArgs,
  CreateLeadPhoneNumberArgs,
  UpdateLeadPhoneNumberArgs,
  DeleteLeadPhoneNumberArgs,
  UpdateLeadPositionArgs,
  ImportLeadFromBusienssArgs,
} from "../args/lead.args";
import { LeadStatus } from "../objects/lead-status.object";
import {
  CreateLeadPayload,
  UpdateLeadPayload,
  DeleteLeadPayload,
  BulkDeleteLeadPayload,
  LeadPhoneNumberPayload,
  DeleteLeadPhoneNumberPayload,
  UpdateLeadPositionPayload,
} from "../objects/lead.object";
import { createLeadSchema } from "@nextier/dto";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";
import { Property } from "@/app/property/models/property.model";
import { LeadPhoneNumber } from "../models/lead-phone-number.model";
import { leadsTable } from "@/database/schema-alias";
import { and, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { ModelNotFoundError } from "@/database/exceptions";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Resolver(() => Lead)
@UseAuthGuard()
export class LeadResolver extends BaseResolver(Lead) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: LeadService,
    @InjectDB() private db: DrizzleClient,
    @InjectQueue("lead") private queue: Queue,
  ) {
    super();
  }

  @Query(() => LeadConnection)
  async leads(@Auth() user: User, @Args() args: LeadConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const result = await this.service.paginate({
      ...args,
      teamId: team.id,
    });
    console.log('LeadConnection result:', JSON.stringify({
      edgesCount: result.edges?.length,
      pageInfo: result.pageInfo,
      hasTotalCount: 'totalCount' in result
    }, null, 2));
    return result;
  }

  @Query(() => Int)
  async leadsCount(@Auth() user: User, @Args() args: LeadsCountArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.count({
      ...args,
      teamId: team.id,
    });
  }

  @Query(() => [LeadStatus])
  async leadStatuses(
    @Auth() user: User,
    @Args() args: FindManyLeadStatusesArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getStatuses(team.id);
  }

  @Query(() => [String])
  async leadTags(@Auth() user: User, @Args() args: BaseTeamArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getTags(team.id);
  }

  @Query(() => Lead)
  async lead(@Auth() user: User, @Args() args: FindOneLeadArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail({
      id: args.id,
      teamId: team.id,
    });
  }

  @Mutation(() => CreateLeadPayload)
  async createLead(
    @Auth() user: User,
    @Args() args: CreateLeadArgs,
  ): Promise<CreateLeadPayload> {
    const input = this.validate(createLeadSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.create({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => UpdateLeadPositionPayload)
  async updateLeadPosition(
    @Auth() user: User,
    @Args() args: UpdateLeadPositionArgs,
  ): Promise<UpdateLeadPositionPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const orderValue = args.newPosition > args.oldPosition ? -1 : 1;

    const orderFilter =
      args.newPosition > args.oldPosition
        ? [
            gt(leadsTable.position, args.oldPosition),
            lte(leadsTable.position, args.newPosition),
          ]
        : [
            gte(leadsTable.position, args.newPosition),
            lt(leadsTable.position, args.oldPosition),
          ];

    const [lead] = await this.db
      .update(leadsTable)
      .set({ position: args.newPosition, status: args.status })
      .where(and(eq(leadsTable.teamId, team.id), eq(leadsTable.id, args.id)))
      .returning();

    if (!lead) {
      throw new ModelNotFoundError("lead not found");
    }

    await this.db
      .update(leadsTable)
      .set({
        position: sql`${leadsTable.position} + ${orderValue}`,
      })
      .where(and(eq(leadsTable.teamId, team.id), ...orderFilter));

    return { lead };
  }

  @Mutation(() => UpdateLeadPayload)
  async updateLead(
    @Auth() user: User,
    @Args() args: UpdateLeadArgs,
  ): Promise<UpdateLeadPayload> {
    const input = this.validate(createLeadSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.update({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => DeleteLeadPayload)
  async deleteLead(
    @Auth() user: User,
    @Args() args: DeleteLeadArgs,
  ): Promise<DeleteLeadPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.remove({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => BulkDeleteLeadPayload)
  async bulkDeleteLead(
    @Auth() user: User,
    @Args() args: BulkDeleteLeadArgs,
  ): Promise<BulkDeleteLeadPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.bulkRemove({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => LeadPhoneNumberPayload)
  async createLeadPhoneNumber(
    @Auth() user: User,
    @Args() args: CreateLeadPhoneNumberArgs,
  ): Promise<LeadPhoneNumberPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const lead = await this.service.findOneOrFail({
      id: args.leadId,
      teamId: team.id,
    });
    return this.service.createPhoneNumber({
      ...args,
      teamId: team.id,
      leadId: lead.id,
    });
  }

  @Mutation(() => LeadPhoneNumberPayload)
  async updateLeadPhoneNumber(
    @Auth() user: User,
    @Args() args: UpdateLeadPhoneNumberArgs,
  ): Promise<LeadPhoneNumberPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const lead = await this.service.findOneOrFail({
      id: args.leadId,
      teamId: team.id,
    });
    return this.service.updatePhoneNumber({
      ...args,
      teamId: team.id,
      leadId: lead.id,
    });
  }

  @Mutation(() => DeleteLeadPhoneNumberPayload)
  async deleteLeadPhoneNumber(
    @Auth() user: User,
    @Args() args: DeleteLeadPhoneNumberArgs,
  ): Promise<DeleteLeadPhoneNumberPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const lead = await this.service.findOneOrFail({
      id: args.leadId,
      teamId: team.id,
    });
    return this.service.removePhoneNumber({
      ...args,
      teamId: team.id,
      leadId: lead.id,
    });
  }

  @Mutation(() => Boolean)
  async importLeadFromBusinessList(
    @Auth() user: User,
    @Args() args: ImportLeadFromBusienssArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    await this.queue.add("IMPORT_BUSINESS_LIST", {
      teamId: team.id,
      input: args.input,
      presetId: args.presetId,
    });

    return true;
  }

  @ResolveField(() => String, { nullable: true })
  name(@Parent() lead: Lead) {
    if (!lead.firstName || !lead.lastName) {
      return null;
    }

    return [lead.firstName, lead.lastName].filter((value) => !!value).join(" ");
  }

  @ResolveField()
  tags(@Parent() lead: Lead) {
    if (!lead.tags?.length) {
      return [];
    }

    // prevent duplicate tags
    return [...new Set(lead.tags)];
  }

  @ResolveField(() => Property, { nullable: true })
  property(@Parent() lead: Lead, @Context("loaders") loaders: Dataloaders) {
    if (!lead.propertyId) {
      return null;
    }
    return loaders.property.load(lead.propertyId);
  }

  @ResolveField(() => [LeadPhoneNumber])
  async phoneNumbers(
    @Parent() lead: Lead,
    @Context("loaders") loaders: Dataloaders,
  ) {
    const numbers = await loaders.leadPhoneNumbers.load(lead.id);
    return numbers;
  }
}
