import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { ResponseGeneratorService } from "../services/response-generator.service";
import {
  CoPilotResponse,
  PhoneConfig,
  ResponseSuggestion,
} from "../models/response-suggestion.model";
import {
  GenerateResponsesArgs,
  AcceptSuggestionArgs,
  RejectSuggestionArgs,
  GetPhoneConfigArgs,
} from "../args/co-pilot.args";

@Resolver(() => CoPilotResponse)
@UseAuthGuard()
export class CoPilotResolver extends BaseResolver(CoPilotResponse) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private responseGenerator: ResponseGeneratorService,
  ) {
    super();
  }

  /**
   * Generate AI response suggestions for an inbound message
   */
  @Query(() => CoPilotResponse)
  async generateResponses(
    @Auth() user: User,
    @Args() args: GenerateResponsesArgs,
  ): Promise<CoPilotResponse> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.responseGenerator.generateResponses(
      team.id,
      args.phoneNumber,
      args.message,
      args.conversationId,
      {
        maxSuggestions: args.maxSuggestions,
        preferredTone: args.preferredTone,
        includeReasoning: args.includeReasoning,
      },
    );
  }

  /**
   * Get phone number configuration for co-pilot
   */
  @Query(() => PhoneConfig, { nullable: true })
  async phoneConfig(
    @Auth() user: User,
    @Args() args: GetPhoneConfigArgs,
  ): Promise<PhoneConfig | null> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.responseGenerator.getPhoneConfig(args.phoneNumber);
  }

  /**
   * Accept a suggestion (tracks for learning)
   */
  @Mutation(() => Boolean)
  async acceptSuggestion(
    @Auth() user: User,
    @Args() args: AcceptSuggestionArgs,
  ): Promise<boolean> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.responseGenerator.acceptSuggestion(
      args.suggestionId,
      team.id,
      user.id,
    );
  }

  /**
   * Reject a suggestion with optional reason
   */
  @Mutation(() => Boolean)
  async rejectSuggestion(
    @Auth() user: User,
    @Args() args: RejectSuggestionArgs,
  ): Promise<boolean> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.responseGenerator.rejectSuggestion(
      args.suggestionId,
      team.id,
      user.id,
      args.reason,
    );
  }
}
