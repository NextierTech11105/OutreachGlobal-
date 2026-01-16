import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Integration } from "../models/integration.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { IntegrationService } from "../services/integration.service";
import {
  ConnectIntegrationPayload,
  SyncIntegrationLeadPayload,
} from "../objects/integration.object";
import { User } from "@/app/user/models/user.model";
import {
  ConnectIntegrationArgs,
  FindOneIntegrationArgs,
  SyncIntegrationLeadArgs,
} from "../args/integration.args";
import { isAfter } from "date-fns";
import { IntegrationTaskService } from "../services/integration-task.service";

@Resolver(() => Integration)
@UseAuthGuard()
export class IntegrationResolver extends BaseResolver(Integration) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: IntegrationService,
    private integrationTaskService: IntegrationTaskService,
  ) {
    super();
  }

  @Query(() => Integration)
  async integration(@Auth() user: User, @Args() args: FindOneIntegrationArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.findOneOrFail({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => SyncIntegrationLeadPayload)
  async syncIntegrationLead(
    @Auth() user: User,
    @Args() args: SyncIntegrationLeadArgs,
  ): Promise<SyncIntegrationLeadPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const integration = await this.service.findOneOrFail({
      id: args.id,
      teamId: team.id,
    });

    return this.integrationTaskService.sync({
      integrationId: integration.id,
      moduleName: args.moduleName,
    });
  }

  @Mutation(() => ConnectIntegrationPayload)
  async connectIntegration(
    @Auth() user: User,
    @Args() args: ConnectIntegrationArgs,
  ): Promise<ConnectIntegrationPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    // Provider name should come from args - for now return placeholder
    return {
      uri: `${process.env.FRONTEND_URL}/settings/integrations?provider=${args.provider}`,
      method: "GET",
    };
  }

  @ResolveField(() => Boolean, { defaultValue: true })
  isExpired(@Parent() integration: Integration) {
    if (!integration.tokenExpiresAt) {
      return false;
    }
    return isAfter(new Date(), integration.tokenExpiresAt);
  }
}
