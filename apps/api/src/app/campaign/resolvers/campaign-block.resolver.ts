import {
  Args,
  Mutation,
  Query,
  Resolver,
  Field,
  ObjectType,
  ArgsType,
  InputType,
  Int,
} from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { campaignBlocks, leadTouches } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { IdField, StringField, IntField } from "@/app/apollo/decorators";
import { TimestampModel } from "@/app/apollo/base-model";

// ============================================
// MODELS
// ============================================

@ObjectType()
export class CampaignBlock extends TimestampModel {
  @StringField()
  campaignId: string;

  @IntField()
  blockNumber: number;

  @StringField()
  status: string;

  @IntField()
  leadsLoaded: number;

  @IntField()
  maxLeads: number;

  @IntField()
  currentTouch: number;

  @IntField()
  maxTouches: number;

  @IntField()
  touchesSent: number;

  @IntField()
  targetTouches: number;

  @Field({ nullable: true })
  startedAt?: Date;

  @Field({ nullable: true })
  pausedAt?: Date;

  @Field({ nullable: true })
  completedAt?: Date;
}

@ObjectType()
export class CampaignBlockConnection {
  @Field(() => [CampaignBlock])
  nodes: CampaignBlock[];

  @IntField()
  totalCount: number;
}

// ============================================
// ARGS & INPUTS
// ============================================

@ArgsType()
class CampaignBlocksArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  campaignId?: string;

  @StringField({ nullable: true })
  status?: string;
}

@ArgsType()
class CampaignBlockArgs {
  @IdField()
  teamId: string;

  @IdField()
  id: string;
}

@InputType()
class CreateCampaignBlockInput {
  @IdField()
  campaignId: string;

  @IntField({ nullable: true })
  maxLeads?: number;

  @IntField({ nullable: true })
  maxTouches?: number;
}

@ArgsType()
class CreateCampaignBlockArgs {
  @IdField()
  teamId: string;

  @Field(() => CreateCampaignBlockInput)
  input: CreateCampaignBlockInput;
}

@ArgsType()
class UpdateBlockStatusArgs {
  @IdField()
  teamId: string;

  @IdField()
  id: string;

  @StringField()
  status: string;
}

// ============================================
// PAYLOADS
// ============================================

@ObjectType()
class CampaignBlockPayload {
  @Field(() => CampaignBlock)
  block: CampaignBlock;
}

// ============================================
// RESOLVER
// ============================================

@Resolver(() => CampaignBlock)
@UseAuthGuard()
export class CampaignBlockResolver extends BaseResolver(CampaignBlock) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => CampaignBlockConnection)
  async campaignBlocks(
    @Auth() user: User,
    @Args() args: CampaignBlocksArgs,
  ): Promise<CampaignBlockConnection> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const conditions = [eq(campaignBlocks.teamId, team.id)];

    if (args.campaignId) {
      conditions.push(eq(campaignBlocks.campaignId, args.campaignId));
    }

    if (args.status) {
      conditions.push(eq(campaignBlocks.status, args.status as any));
    }

    const blocks = await this.db
      .select()
      .from(campaignBlocks)
      .where(and(...conditions))
      .orderBy(desc(campaignBlocks.createdAt));

    return {
      nodes: blocks as CampaignBlock[],
      totalCount: blocks.length,
    };
  }

  @Query(() => CampaignBlock)
  async campaignBlock(
    @Auth() user: User,
    @Args() args: CampaignBlockArgs,
  ): Promise<CampaignBlock> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const [block] = await this.db
      .select()
      .from(campaignBlocks)
      .where(
        and(eq(campaignBlocks.id, args.id), eq(campaignBlocks.teamId, team.id)),
      );

    if (!block) {
      throw new Error("Campaign block not found");
    }

    return block as CampaignBlock;
  }

  @Mutation(() => CampaignBlockPayload)
  async createCampaignBlock(
    @Auth() user: User,
    @Args() args: CreateCampaignBlockArgs,
  ): Promise<CampaignBlockPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    const { input } = args;

    // Get next block number for this campaign
    const existingBlocks = await this.db
      .select()
      .from(campaignBlocks)
      .where(eq(campaignBlocks.campaignId, input.campaignId));

    const nextBlockNumber = existingBlocks.length + 1;

    const [block] = await this.db
      .insert(campaignBlocks)
      .values({
        teamId: team.id,
        campaignId: input.campaignId,
        blockNumber: nextBlockNumber,
        maxLeads: input.maxLeads ?? 2000,
        maxTouches: input.maxTouches ?? 6,
        targetTouches: (input.maxLeads ?? 2000) * (input.maxTouches ?? 6),
        status: "preparing",
      })
      .returning();

    return { block: block as CampaignBlock };
  }

  @Mutation(() => CampaignBlockPayload)
  async updateCampaignBlockStatus(
    @Auth() user: User,
    @Args() args: UpdateBlockStatusArgs,
  ): Promise<CampaignBlockPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    const updateData: any = { status: args.status };

    // Set timestamps based on status
    if (args.status === "active") {
      updateData.startedAt = new Date();
      updateData.pausedAt = null;
    } else if (args.status === "paused") {
      updateData.pausedAt = new Date();
    } else if (args.status === "completed") {
      updateData.completedAt = new Date();
    }

    const [block] = await this.db
      .update(campaignBlocks)
      .set(updateData)
      .where(
        and(
          eq(campaignBlocks.id, args.id),
          eq(campaignBlocks.teamId, team.id),
        ),
      )
      .returning();

    if (!block) {
      throw new Error("Campaign block not found");
    }

    return { block: block as CampaignBlock };
  }
}
