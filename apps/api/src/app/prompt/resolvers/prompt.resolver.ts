import { Args, Int, Query, Resolver, Mutation } from "@nestjs/graphql";
import { Prompt, PromptConnection } from "../models/prompt.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { PromptService } from "../services/prompt.service";
import { User } from "@/app/user/models/user.model";
import {
  PromptConnectionArgs,
  FindOnePromptArgs,
  CreatePromptArgs,
  UpdatePromptArgs,
  DeletePromptArgs,
  BulkDeletePromptArgs,
} from "../args/prompt.args";
import {
  CreatePromptPayload,
  UpdatePromptPayload,
  DeletePromptPayload,
  BulkDeletePromptPayload,
} from "../objects/prompt.object";
import { createPromptSchema } from "@nextier/dto";

@Resolver(() => Prompt)
@UseAuthGuard()
export class PromptResolver extends BaseResolver(Prompt) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: PromptService,
  ) {
    super();
  }

  @Query(() => PromptConnection)
  async prompts(@Auth() user: User, @Args() args: PromptConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Query(() => Int)
  async promptsCount(@Auth() user: User, @Args() args: PromptConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.count(team.id);
  }

  @Query(() => Prompt)
  async prompt(@Auth() user: User, @Args() args: FindOnePromptArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail({
      id: args.id,
      teamId: team.id,
    });
  }

  @Mutation(() => CreatePromptPayload)
  async createPrompt(
    @Auth() user: User,
    @Args() args: CreatePromptArgs,
  ): Promise<CreatePromptPayload> {
    const input = this.validate(createPromptSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.create({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => UpdatePromptPayload)
  async updatePrompt(
    @Auth() user: User,
    @Args() args: UpdatePromptArgs,
  ): Promise<UpdatePromptPayload> {
    const input = this.validate(createPromptSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.update({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => DeletePromptPayload)
  async deletePrompt(
    @Auth() user: User,
    @Args() args: DeletePromptArgs,
  ): Promise<DeletePromptPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.remove({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => BulkDeletePromptPayload)
  async bulkDeletePrompt(
    @Auth() user: User,
    @Args() args: BulkDeletePromptArgs,
  ): Promise<BulkDeletePromptPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.bulkRemove({
      ...args,
      teamId: team.id,
    });
  }
}
