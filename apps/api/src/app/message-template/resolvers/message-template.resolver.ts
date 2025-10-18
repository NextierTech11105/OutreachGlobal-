import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  MessageTemplate,
  MessageTemplateConnection,
} from "../models/message-template.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import {
  CreateMessageTemplateArgs,
  DeleteMessageTemplateArgs,
  FindOneMessageTemplateArgs,
  GenerateMessageTemplateArgs,
  MessageTemplateConnectionArgs,
  UpdateMessageTemplateArgs,
} from "../args/message-template.args";
import { MessageTemplateService } from "../services/message-template.service";
import {
  CreateMessageTemplatePayload,
  DeleteMessageTemplatePayload,
  GenerateMessageTemplatePayload,
  UpdateMessageTemplatePayload,
} from "../objects/message-template.object";

@Resolver(() => MessageTemplate)
@UseAuthGuard()
export class MessageTemplateResolver extends BaseResolver(MessageTemplate) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: MessageTemplateService,
  ) {
    super();
  }

  @Query(() => MessageTemplateConnection)
  async messageTemplates(
    @Auth() user: User,
    @Args() args: MessageTemplateConnectionArgs,
  ): Promise<MessageTemplateConnection> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate(args);
  }

  @Query(() => MessageTemplate)
  async messageTemplate(
    @Auth() user: User,
    @Args() args: FindOneMessageTemplateArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail({
      id: args.id,
      teamId: team.id,
    });
  }

  @Mutation(() => CreateMessageTemplatePayload)
  async createMessageTemplate(
    @Auth() user: User,
    @Args() args: CreateMessageTemplateArgs,
  ): Promise<CreateMessageTemplatePayload> {
    const schema = this.service.getSchema(args.type);
    const input = this.validate(schema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.create({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => UpdateMessageTemplatePayload)
  async updateMessageTemplate(
    @Auth() user: User,
    @Args() args: UpdateMessageTemplateArgs,
  ): Promise<UpdateMessageTemplatePayload> {
    const schema = this.service.getSchema(args.type);
    const input = this.validate(schema, args.input);
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.update({
      ...args,
      input,
      teamId: team.id,
    });
  }

  @Mutation(() => DeleteMessageTemplatePayload)
  async deleteMessageTemplate(
    @Auth() user: User,
    @Args() args: DeleteMessageTemplateArgs,
  ): Promise<DeleteMessageTemplatePayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.remove({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => GenerateMessageTemplatePayload)
  async generateMessageTemplate(
    @Auth() user: User,
    @Args() args: GenerateMessageTemplateArgs,
  ): Promise<GenerateMessageTemplatePayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.generate({
      ...args,
      teamId: team.id,
    });
  }
}
