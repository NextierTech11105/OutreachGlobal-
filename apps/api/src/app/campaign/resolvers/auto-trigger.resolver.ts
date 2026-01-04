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
import { autoTriggers, triggerExecutions } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  IdField,
  StringField,
  IntField,
  BooleanField,
} from "@/app/apollo/decorators";
import { TimestampModel } from "@/app/apollo/base-model";
import { GraphQLJSON } from "graphql-scalars";

// ============================================
// MODELS
// ============================================

@ObjectType()
export class AutoTrigger extends TimestampModel {
  @StringField()
  name: string;

  @StringField()
  type: string;

  @BooleanField()
  enabled: boolean;

  @StringField()
  templateId: string;

  @StringField()
  templateName: string;

  @Field(() => GraphQLJSON)
  config: Record<string, unknown>;

  @IntField()
  firedCount: number;

  @Field({ nullable: true })
  lastFiredAt?: Date;
}

@ObjectType()
export class TriggerExecution extends TimestampModel {
  @StringField()
  triggerId: string;

  @StringField()
  leadId: string;

  @StringField()
  status: string;

  @Field({ nullable: true })
  sentAt?: Date;

  @Field({ nullable: true })
  failedAt?: Date;

  @StringField({ nullable: true })
  failedReason?: string;

  @StringField({ nullable: true })
  eventType?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  eventData?: Record<string, unknown>;
}

@ObjectType()
export class AutoTriggerConnection {
  @Field(() => [AutoTrigger])
  nodes: AutoTrigger[];

  @IntField()
  totalCount: number;
}

@ObjectType()
export class TriggerExecutionConnection {
  @Field(() => [TriggerExecution])
  nodes: TriggerExecution[];

  @IntField()
  totalCount: number;
}

// ============================================
// ARGS & INPUTS
// ============================================

@ArgsType()
class AutoTriggersArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  type?: string;

  @BooleanField({ nullable: true })
  enabled?: boolean;
}

@ArgsType()
class TriggerExecutionsArgs {
  @IdField()
  teamId: string;

  @IdField({ nullable: true })
  triggerId?: string;

  @IntField({ nullable: true })
  limit?: number;
}

@InputType()
class CreateAutoTriggerInput {
  @StringField()
  name: string;

  @StringField()
  type: string;

  @StringField()
  templateId: string;

  @StringField()
  templateName: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: Record<string, unknown>;
}

@ArgsType()
class CreateAutoTriggerArgs {
  @IdField()
  teamId: string;

  @Field(() => CreateAutoTriggerInput)
  input: CreateAutoTriggerInput;
}

@ArgsType()
class ToggleTriggerArgs {
  @IdField()
  teamId: string;

  @IdField()
  id: string;

  @BooleanField()
  enabled: boolean;
}

@ArgsType()
class DeleteTriggerArgs {
  @IdField()
  teamId: string;

  @IdField()
  id: string;
}

// ============================================
// PAYLOADS
// ============================================

@ObjectType()
class AutoTriggerPayload {
  @Field(() => AutoTrigger)
  trigger: AutoTrigger;
}

@ObjectType()
class DeleteTriggerPayload {
  @BooleanField()
  success: boolean;

  @IdField()
  deletedId: string;
}

// ============================================
// RESOLVER
// ============================================

@Resolver(() => AutoTrigger)
@UseAuthGuard()
export class AutoTriggerResolver extends BaseResolver(AutoTrigger) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => AutoTriggerConnection)
  async autoTriggers(
    @Auth() user: User,
    @Args() args: AutoTriggersArgs,
  ): Promise<AutoTriggerConnection> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const conditions = [eq(autoTriggers.teamId, team.id)];

    if (args.type) {
      conditions.push(eq(autoTriggers.type, args.type as any));
    }

    if (args.enabled !== undefined) {
      conditions.push(eq(autoTriggers.enabled, args.enabled));
    }

    const triggers = await this.db
      .select()
      .from(autoTriggers)
      .where(and(...conditions))
      .orderBy(desc(autoTriggers.createdAt));

    return {
      nodes: triggers as AutoTrigger[],
      totalCount: triggers.length,
    };
  }

  @Query(() => TriggerExecutionConnection)
  async triggerExecutions(
    @Auth() user: User,
    @Args() args: TriggerExecutionsArgs,
  ): Promise<TriggerExecutionConnection> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const conditions = [eq(triggerExecutions.teamId, team.id)];

    if (args.triggerId) {
      conditions.push(eq(triggerExecutions.triggerId, args.triggerId));
    }

    const executions = await this.db
      .select()
      .from(triggerExecutions)
      .where(and(...conditions))
      .orderBy(desc(triggerExecutions.createdAt))
      .limit(args.limit ?? 50);

    return {
      nodes: executions as TriggerExecution[],
      totalCount: executions.length,
    };
  }

  @Mutation(() => AutoTriggerPayload)
  async createAutoTrigger(
    @Auth() user: User,
    @Args() args: CreateAutoTriggerArgs,
  ): Promise<AutoTriggerPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    const { input } = args;

    const [trigger] = await this.db
      .insert(autoTriggers)
      .values({
        teamId: team.id,
        name: input.name,
        type: input.type as any,
        templateId: input.templateId,
        templateName: input.templateName,
        config: input.config ?? {},
        enabled: true,
      })
      .returning();

    return { trigger: trigger as AutoTrigger };
  }

  @Mutation(() => AutoTriggerPayload)
  async toggleAutoTrigger(
    @Auth() user: User,
    @Args() args: ToggleTriggerArgs,
  ): Promise<AutoTriggerPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    const [trigger] = await this.db
      .update(autoTriggers)
      .set({ enabled: args.enabled })
      .where(
        and(eq(autoTriggers.id, args.id), eq(autoTriggers.teamId, team.id)),
      )
      .returning();

    if (!trigger) {
      throw new Error("Trigger not found");
    }

    return { trigger: trigger as AutoTrigger };
  }

  @Mutation(() => DeleteTriggerPayload)
  async deleteAutoTrigger(
    @Auth() user: User,
    @Args() args: DeleteTriggerArgs,
  ): Promise<DeleteTriggerPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    await this.db
      .delete(autoTriggers)
      .where(
        and(eq(autoTriggers.id, args.id), eq(autoTriggers.teamId, team.id)),
      );

    return { success: true, deletedId: args.id };
  }
}
