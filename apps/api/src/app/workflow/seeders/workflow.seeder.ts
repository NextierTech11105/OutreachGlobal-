import { tryRollback } from "@haorama/drizzle-postgres-extra";
import { Injectable } from "@nestjs/common";
import {
  workflowFieldsTable,
  workflowTaskFieldsTable,
  workflowTasksTable,
} from "@/database/schema-alias";
import { sql } from "drizzle-orm";
import {
  workflowTaskActionsData,
  workflowTaskTriggersData,
  workflowFieldsData,
} from "../data/workflow.data";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";

@Injectable()
export class WorkflowSeeder {
  constructor(@InjectDB() private db: DrizzleClient) {}

  filterFieldKeys(keys: string[]) {
    return workflowFieldsData.filter((field) => keys.includes(field.key));
  }

  filterTaskIds(ids: string[]) {
    return workflowTaskActionsData.filter((task) => ids.includes(task.id));
  }

  async run() {
    await this.db.transaction(async (tx) => {
      try {
        await tx
          .insert(workflowFieldsTable)
          .values(workflowFieldsData)
          .onConflictDoUpdate({
            target: [workflowFieldsTable.key],
            set: {
              validations: sql`excluded.validations`,
              possibleObjectTypes: sql`excluded.possible_object_types`,
            },
          });

        const taskValues = [
          ...workflowTaskTriggersData,
          ...workflowTaskActionsData,
        ];

        await tx
          .insert(workflowTasksTable)
          .values(taskValues)
          .onConflictDoUpdate({
            target: [workflowTasksTable.id],
            set: {
              objectTypes: sql`excluded.object_types`,
            },
          });

        const taskFields = taskValues.filter((task) => task.fields.length > 0);

        if (taskFields.length) {
          const taskFieldValues = taskFields.flatMap((task) => {
            return task.fields.map((fieldKey) => ({
              fieldKey: typeof fieldKey === "string" ? fieldKey : fieldKey.id,
              taskId: task.id,
              metadata:
                typeof fieldKey === "string"
                  ? undefined
                  : fieldKey.metadata || undefined,
            }));
          });

          await tx
            .insert(workflowTaskFieldsTable)
            .values(taskFieldValues)
            .onConflictDoUpdate({
              target: [
                workflowTaskFieldsTable.taskId,
                workflowTaskFieldsTable.fieldKey,
              ],
              set: {
                metadata: sql`excluded.metadata`,
              },
            });
        }
      } catch (error) {
        tryRollback(tx);
        throw error;
      }
    });
  }
}
