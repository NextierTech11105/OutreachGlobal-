import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { BadRequestException, Injectable } from "@nestjs/common";
import { IntegrationTaskConnectionArgs } from "../args/integration-task.args";
import {
  integrationFieldsTable,
  integrationTasksTable,
} from "@/database/schema-alias";
import { and, eq } from "drizzle-orm";
import { eqOrUndefined, getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { DatabaseService } from "@/database/services/database.service";
import {
  SetIntegrationTaskStatusOptions,
  SyncIntegrationLeadTaskOptions,
} from "../types/integration-task.type";
import { InjectQueue } from "@nestjs/bullmq";
import {
  INTEGRATION_TASK_QUEUE,
  IntegrationTaskJob,
} from "../constants/integration-task.constants";
import { Queue } from "bullmq";

@Injectable()
export class IntegrationTaskService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
    @InjectQueue(INTEGRATION_TASK_QUEUE) private queue: Queue,
  ) {}

  paginate(options: IntegrationTaskConnectionArgs) {
    const query = this.db
      .select()
      .from(integrationTasksTable)
      .where((t) =>
        and(
          eq(t.integrationId, options.integrationId),
          eqOrUndefined(t.moduleName, options.moduleName),
        ),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  /**
   * haha weird function name
   */
  async sync(options: SyncIntegrationLeadTaskOptions) {
    const fieldsCount = await this.db.$count(
      integrationFieldsTable,
      and(
        eq(integrationFieldsTable.integrationId, options.integrationId),
        eq(integrationFieldsTable.moduleName, options.moduleName),
      ),
    );

    const existingTask = await this.db.query.integrationTasks.findFirst({
      where: (t) =>
        and(
          eq(t.integrationId, options.integrationId),
          eq(t.moduleName, options.moduleName),
          eq(t.status, "PENDING"),
        ),
    });

    if (existingTask) {
      throw new BadRequestException(
        "cannot sync same module before the previous one is completed or failed",
      );
    }

    if (!fieldsCount) {
      throw new BadRequestException(`no field mapping detected in this module`);
    }

    const [task] = await this.db
      .insert(integrationTasksTable)
      .values({
        integrationId: options.integrationId,
        moduleName: options.moduleName,
        type: "SYNC_LEAD",
        status: "PENDING",
      })
      .returning();

    await this.queue.add(
      IntegrationTaskJob.SYNC_LEAD,
      {
        task,
      },
      {
        deduplication: {
          id: `SYNC_LEAD_${task.id}`,
        },
      },
    );

    return { task };
  }

  async setStatus({ id, status }: SetIntegrationTaskStatusOptions) {
    await this.db
      .update(integrationTasksTable)
      .set({
        status,
      })
      .where(eq(integrationTasksTable.id, id));
  }
}
