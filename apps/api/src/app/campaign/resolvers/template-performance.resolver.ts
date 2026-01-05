import {
  Args,
  Query,
  Resolver,
  Field,
  ObjectType,
  ArgsType,
  Int,
  Float,
} from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { templatePerformance } from "@/database/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { IdField, StringField, IntField } from "@/app/apollo/decorators";
import { TimestampModel } from "@/app/apollo/base-model";

// ============================================
// MODELS
// ============================================

@ObjectType()
export class TemplatePerformanceMetrics extends TimestampModel {
  @StringField()
  templateId: string;

  @StringField()
  templateName: string;

  @StringField({ nullable: true })
  campaignId?: string;

  @StringField({ nullable: true })
  campaignLane?: string;

  @Field()
  periodStart: Date;

  @Field()
  periodEnd: Date;

  // Delivery metrics
  @IntField()
  totalSent: number;

  @IntField()
  totalDelivered: number;

  @IntField()
  totalFailed: number;

  // Response metrics
  @IntField()
  totalReplied: number;

  @IntField()
  positiveReplies: number;

  @IntField()
  negativeReplies: number;

  @IntField()
  questionReplies: number;

  @IntField()
  neutralReplies: number;

  // Conversion metrics
  @IntField()
  emailsCaptured: number;

  @IntField()
  callsScheduled: number;

  @IntField()
  meetingsBooked: number;

  // Suppression metrics
  @IntField()
  optOuts: number;

  @IntField()
  wrongNumbers: number;

  @IntField()
  complaints: number;

  // Computed rates
  @Field(() => Float, { nullable: true })
  deliveryRate?: number;

  @Field(() => Float, { nullable: true })
  replyRate?: number;

  @Field(() => Float, { nullable: true })
  positiveRate?: number;

  @Field(() => Float, { nullable: true })
  conversionRate?: number;

  @Field(() => Float, { nullable: true })
  optOutRate?: number;

  @Field(() => Float, { nullable: true })
  compositeScore?: number;

  // Touch performance
  @IntField({ nullable: true })
  touch1Sent?: number;

  @IntField({ nullable: true })
  touch1Replied?: number;

  @IntField({ nullable: true })
  touch2Sent?: number;

  @IntField({ nullable: true })
  touch2Replied?: number;

  @IntField({ nullable: true })
  touch3Sent?: number;

  @IntField({ nullable: true })
  touch3Replied?: number;

  @IntField({ nullable: true })
  touch4Sent?: number;

  @IntField({ nullable: true })
  touch4Replied?: number;

  @IntField({ nullable: true })
  touch5Sent?: number;

  @IntField({ nullable: true })
  touch5Replied?: number;
}

@ObjectType()
export class TemplatePerformanceConnection {
  @Field(() => [TemplatePerformanceMetrics])
  nodes: TemplatePerformanceMetrics[];

  @IntField()
  totalCount: number;
}

// ============================================
// ARGS
// ============================================

@ArgsType()
class TemplatePerformanceArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  templateId?: string;

  @StringField({ nullable: true })
  campaignId?: string;

  @StringField({ nullable: true })
  period?: string; // "7d", "30d", "90d", "all"
}

// ============================================
// RESOLVER
// ============================================

@Resolver(() => TemplatePerformanceMetrics)
@UseAuthGuard()
export class TemplatePerformanceResolver extends BaseResolver(
  TemplatePerformanceMetrics,
) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => TemplatePerformanceConnection)
  async templatePerformance(
    @Auth() user: User,
    @Args() args: TemplatePerformanceArgs,
  ): Promise<TemplatePerformanceConnection> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const conditions = [eq(templatePerformance.teamId, team.id)];

    // Filter by period
    if (args.period && args.period !== "all") {
      const days = args.period === "7d" ? 7 : args.period === "30d" ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      conditions.push(gte(templatePerformance.periodStart, cutoff));
    }

    if (args.templateId) {
      conditions.push(eq(templatePerformance.templateId, args.templateId));
    }

    if (args.campaignId) {
      conditions.push(eq(templatePerformance.campaignId, args.campaignId));
    }

    const results = await this.db
      .select()
      .from(templatePerformance)
      .where(and(...conditions))
      .orderBy(desc(templatePerformance.compositeScore));

    // Convert decimal fields to numbers
    const nodes = results.map((r) => ({
      ...r,
      deliveryRate: r.deliveryRate ? parseFloat(r.deliveryRate) : null,
      replyRate: r.replyRate ? parseFloat(r.replyRate) : null,
      positiveRate: r.positiveRate ? parseFloat(r.positiveRate) : null,
      conversionRate: r.conversionRate ? parseFloat(r.conversionRate) : null,
      optOutRate: r.optOutRate ? parseFloat(r.optOutRate) : null,
      compositeScore: r.compositeScore ? parseFloat(r.compositeScore) : null,
    })) as TemplatePerformanceMetrics[];

    return {
      nodes,
      totalCount: nodes.length,
    };
  }
}
