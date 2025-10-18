import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Workflow, WorkflowConnection } from "../models/workflow.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { WorkflowService } from "../services/workflow.service";
import {
  CreateWorkflowArgs,
  WorkflowConnectionArgs,
} from "../args/workflow.args";
import { CreateWorkflowPayload } from "../objects/workflow.object";
import { WorkflowTask } from "../models/workflow-task.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { and, eq } from "drizzle-orm";
import { orFail } from "@/database/exceptions";
import { WorkflowTaskType } from "@nextier/common";

@Resolver(() => Workflow)
@UseAuthGuard()
export class WorkflowResolver extends BaseResolver(Workflow) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: WorkflowService,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  @Query(() => WorkflowConnection)
  async workflows(@Auth() user: User, @Args() args: WorkflowConnectionArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.service.paginate({
      ...args,
      teamId: team.id,
    });
  }

  @Mutation(() => CreateWorkflowPayload)
  async createWorkflow(
    @Auth() user: User,
    @Args() args: CreateWorkflowArgs,
  ): Promise<CreateWorkflowPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);

    return this.service.create({
      ...args,
      teamId: team.id,
    });
  }

  @ResolveField(() => WorkflowTask)
  async trigger(@Parent() parent: Workflow) {
    const triggerStep = await this.db.query.workflowSteps
      .findFirst({
        where: (t) =>
          and(
            eq(t.workflowId, parent.id),
            eq(t.taskType, WorkflowTaskType.TRIGGER),
          ),
      })
      .then(orFail("workflow step not found"));

    return this.db.query.workflowTasks.findFirst({
      where: (t) => eq(t.id, triggerStep.taskId),
    });
  }
}
