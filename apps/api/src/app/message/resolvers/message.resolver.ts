import { BaseResolver } from "@/app/apollo/base.resolver";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { TeamService } from "@/app/team/services/team.service";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Message } from "twilio/lib/twiml/MessagingResponse";
import { MessageService } from "../services/message.service";
import { CreateMessagePayload } from "../objects/message.object";
import { User } from "@/app/user/models/user.model";
import { CreateMessageArgs, MessageConnectionArgs } from "../args/message.args";
import { MessageConnection } from "../models/message.model";

@Resolver(() => Message)
@UseAuthGuard()
export class MessageResolver extends BaseResolver(Message) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: MessageService,
  ) {
    super();
  }

  @Query(() => MessageConnection)
  async messages(@Auth() user: User, @Args() args: MessageConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => CreateMessagePayload)
  async createMessage(
    @Auth() user: User,
    @Args() args: CreateMessageArgs,
  ): Promise<CreateMessagePayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.service.create({
      ...args,
      teamId: team.id,
    });
  }
}
