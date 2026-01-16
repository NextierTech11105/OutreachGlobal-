import { Args, Query, Resolver } from "@nestjs/graphql";
import { ModuleMetadata } from "../objects/module-metadata.object";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { FindOneModuleMetadataArgs } from "../args/module-metadata.args";
import { IntegrationService } from "../services/integration.service";

@Resolver(() => ModuleMetadata)
@UseAuthGuard()
export class ModuleMetadataResolver extends BaseResolver(ModuleMetadata) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private integrationService: IntegrationService,
  ) {
    super();
  }

  @Query(() => ModuleMetadata)
  async moduleMetadata(
    @Auth() user: User,
    @Args() args: FindOneModuleMetadataArgs,
  ): Promise<ModuleMetadata> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const integration = await this.integrationService.findOneOrFail({
      id: args.provider,
      teamId: team.id,
    });

    // TODO: Add provider-specific field fetching here
    // For now, return empty fields - will be populated when providers are added
    return {
      name: args.name,
      fields: [],
    };
  }
}
