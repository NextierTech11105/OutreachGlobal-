import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  CreateWorkflowArgs,
  WorkflowConnectionArgs,
} from "../args/workflow.args";
import { workflowsTable, workflowStepsTable } from "@/database/schema-alias";
import { and, eq, inArray } from "drizzle-orm";
import { DatabaseService } from "@/database/services/database.service";
import { getCursorOrder, tryRollback } from "@haorama/drizzle-postgres-extra";
import { generateUlid } from "@/database/columns/ulid";
import { WorkflowFieldValueType, WorkflowTaskType } from "@nextier/common";
import { getTaskInternalId } from "../utils/workflow-internal-id";
import { orFail } from "@/database/exceptions";
import { WorkflowStepInsert } from "../models/workflow-step.model";

@Injectable()
export class WorkflowService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {}

  async paginate(options: WorkflowConnectionArgs) {
    const query = this.db
      .select()
      .from(workflowsTable)
      .where((t) =>
        and(
          eq(t.teamId, options.teamId),
          typeof options.active === "boolean"
            ? eq(t.active, options.active)
            : undefined,
        ),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async create({ input, teamId }: CreateWorkflowArgs) {
    const trigger = await this.db.query.workflowTasks
      .findFirst({
        where: (t) =>
          and(
            eq(t.type, WorkflowTaskType.TRIGGER),
            eq(t.id, getTaskInternalId(input.trigger)),
          ),
      })
      .then(orFail("workflow trigger not found"));

    const actions = await this.db.query.workflowTasks.findMany({
      where: (t) =>
        and(
          eq(t.type, WorkflowTaskType.ACTION),
          inArray(
            t.id,
            input.actions.map((action) => getTaskInternalId(action.name)),
          ),
        ),
    });

    if (!actions.length) {
      throw new BadRequestException("Actions is required at least 1");
    }

    const result = await this.db.transaction(async (tx) => {
      try {
        const [workflow] = await tx
          .insert(workflowsTable)
          .values({
            ...input,
            teamId,
            version: generateUlid("wver"),
          })
          .returning();

        const stepValues: WorkflowStepInsert[] = [
          {
            workflowId: workflow.id,
            taskId: trigger.id,
            position: { x: 0, y: 0 },
            taskType: WorkflowTaskType.TRIGGER,
            order: 1,
          },
        ];

        input.actions.forEach((inputAction) => {
          const action = actions.find(
            (action) => getTaskInternalId(inputAction.name) === action.id,
          );

          if (!action) {
            throw new BadRequestException(
              `Action ${inputAction.name} not found`,
            );
          }

          stepValues.push({
            workflowId: workflow.id,
            taskId: action.id,
            position: { x: 0, y: 0 },
            taskType: WorkflowTaskType.ACTION,
            order: stepValues.length + 1,
            data: {
              default: {
                type: WorkflowFieldValueType.STRING,
                value: inputAction.value,
              },
            },
          });
        });

        if (stepValues.length) {
          await tx.insert(workflowStepsTable).values(stepValues);
        }

        return { workflow };
      } catch (error) {
        tryRollback(tx);
        throw new InternalServerErrorException(error);
      }
    });

    return result;
  }
}
