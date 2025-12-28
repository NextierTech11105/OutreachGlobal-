import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { User } from "@/app/user/models/user.model";
import { ApiKey, NewApiKeyResponse } from "../models/api-key.model";
import { ApiKeyService } from "../services/api-key.service";
import { ApiKeyType } from "@/database/schema";
import { Field, InputType, ArgsType } from "@nestjs/graphql";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { TeamService } from "@/app/team/services/team.service";

@InputType()
export class CreateApiKeyInput {
  @Field()
  teamId: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true, defaultValue: "USER" })
  type?: string;
}

@ArgsType()
export class ListApiKeysArgs {
  @Field()
  teamId: string;
}

@ArgsType()
export class RevokeApiKeyArgs {
  @Field()
  keyId: string;

  @Field()
  teamId: string;
}

@Resolver(() => ApiKey)
@UseAuthGuard()
export class ApiKeyResolver {
  constructor(
    private apiKeyService: ApiKeyService,
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
  ) {}

  /**
   * Generate a new API key for the team
   *
   * The raw key is ONLY returned once - user must copy it immediately!
   */
  @Mutation(() => NewApiKeyResponse, {
    description:
      "Generate a new API key. The raw key is ONLY shown once - copy it immediately!",
  })
  async createApiKey(
    @Auth() user: User,
    @Args("input") input: CreateApiKeyInput,
  ): Promise<NewApiKeyResponse> {
    // Verify user has access to this team
    const team = await this.teamService.findById(input.teamId);
    await this.teamPolicy.can().manage(user, team);

    const result = await this.apiKeyService.createKey({
      teamId: input.teamId,
      userId: user.id,
      name: input.name,
      description: input.description,
      type: (input.type as ApiKeyType) || ApiKeyType.USER,
    });

    return result;
  }

  /**
   * List all API keys for a team
   */
  @Query(() => [ApiKey])
  async apiKeys(
    @Auth() user: User,
    @Args() args: ListApiKeysArgs,
  ): Promise<ApiKey[]> {
    // Verify user has access to this team
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    const keys = await this.apiKeyService.listKeys(args.teamId);
    return keys as any;
  }

  /**
   * Revoke (permanently delete) an API key
   */
  @Mutation(() => Boolean)
  async revokeApiKey(
    @Auth() user: User,
    @Args() args: RevokeApiKeyArgs,
  ): Promise<boolean> {
    // Verify user has access to this team
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    return this.apiKeyService.revokeKey(args.keyId, args.teamId);
  }

  /**
   * Deactivate an API key (can be reactivated later)
   */
  @Mutation(() => Boolean)
  async deactivateApiKey(
    @Auth() user: User,
    @Args() args: RevokeApiKeyArgs,
  ): Promise<boolean> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    return this.apiKeyService.deactivateKey(args.keyId, args.teamId);
  }

  /**
   * Reactivate a deactivated API key
   */
  @Mutation(() => Boolean)
  async activateApiKey(
    @Auth() user: User,
    @Args() args: RevokeApiKeyArgs,
  ): Promise<boolean> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    return this.apiKeyService.activateKey(args.keyId, args.teamId);
  }

  /**
   * Rotate an API key (create new, deactivate old)
   */
  @Mutation(() => NewApiKeyResponse, { nullable: true })
  async rotateApiKey(
    @Auth() user: User,
    @Args() args: RevokeApiKeyArgs,
  ): Promise<NewApiKeyResponse | null> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    return this.apiKeyService.rotateKey(args.keyId, args.teamId);
  }
}
