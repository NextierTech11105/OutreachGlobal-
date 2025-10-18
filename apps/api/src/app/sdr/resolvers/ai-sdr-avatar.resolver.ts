import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import {
  AiSdrAvatar,
  AiSdrAvatarConnection,
} from "../models/ai-sdr-avatar.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { AiSdrAvatarService } from "../services/ai-sdr-avatar.service";
import { User } from "@/app/user/models/user.model";
import {
  AiSdrAvatarConnectionArgs,
  CreateAiSdrAvatarArgs,
  DeleteAiSdrAvatarArgs,
  FindAiSdrAvatarArgs,
  UpdateAiSdrAvatarArgs,
} from "../args/ai-sdr-avatar.args";
import { AiSdrFaq } from "../objects/ai-sdr-faq.object";
import {
  CreateAiSdrAvatarPayload,
  DeleteAiSdrAvatarPayload,
  UpdateAiSdrAvatarPayload,
} from "../objects/ai-sdr-avatar.object";
import { aiSdrAvatarSchema } from "@nextier/dto";

@Resolver(() => AiSdrAvatar)
@UseAuthGuard()
export class AiSdrAvatarResolver extends BaseResolver(AiSdrAvatar) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: AiSdrAvatarService,
  ) {
    super();
  }

  @Query(() => AiSdrAvatarConnection)
  async aiSdrAvatars(
    @Auth() user: User,
    @Args() args: AiSdrAvatarConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Query(() => AiSdrAvatar)
  async aiSdrAvatar(@Auth() user: User, @Args() args: FindAiSdrAvatarArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => CreateAiSdrAvatarPayload)
  async createAiSdrAvatar(
    @Auth() user: User,
    @Args() args: CreateAiSdrAvatarArgs,
  ) {
    const input = this.validate(aiSdrAvatarSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.service.create({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => UpdateAiSdrAvatarPayload)
  async updateAiSdrAvatar(
    @Auth() user: User,
    @Args() args: UpdateAiSdrAvatarArgs,
  ) {
    const input = this.validate(aiSdrAvatarSchema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.service.update({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => DeleteAiSdrAvatarPayload)
  async deleteAiSdrAvatar(
    @Auth() user: User,
    @Args() args: DeleteAiSdrAvatarArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.service.remove({
      id: args.id,
      teamId: team.id,
    });
  }

  @ResolveField(() => [AiSdrFaq])
  async faqs(@Parent() avatar: AiSdrAvatar) {
    return avatar.faqs || [];
  }
}
