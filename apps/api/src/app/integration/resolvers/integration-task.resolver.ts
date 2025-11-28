import { Args, Query, Resolver } from "@nestjs/graphql";
import {
  IntegrationTask,
  IntegrationTaskConnection,
} from "../models/integration-task.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { IntegrationService } from "../services/integration.service";
import { IntegrationTaskService } from "../services/integration-task.service";
import { User } from "@/app/user/models/user.model";
import { IntegrationTaskConnectionArgs } from "../args/integration-task.args";

@Resolver(() => IntegrationTask)
@UseAuthGuard()
export class IntegrationTaskResolver extends BaseResolver(IntegrationTask) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private integrationService: IntegrationService,
    private service: IntegrationTaskService,
  ) {
    super();
  }

  @Query(() => IntegrationTaskConnection)
  async integrationTasks(
    @Auth() user: User,
    @Args() args: IntegrationTaskConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const integration = await this.integrationService.findOneOrFail({
      id: args.integrationId,
      teamId: team.id,
    });

    return this.service.paginate({
      ...args,
      integrationId: integration.id,
      teamId: team.id,
    });
  }
}
