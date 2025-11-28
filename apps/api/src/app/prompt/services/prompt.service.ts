import { InjectDB } from "@/database/decorators";
import { DatabaseService } from "@/database/services/database.service";
import { DrizzleClient } from "@/database/types";
import { Injectable } from "@nestjs/common";
import {
  PromptConnectionArgs,
  FindOnePromptArgs,
  CreatePromptArgs,
  UpdatePromptArgs,
  DeletePromptArgs,
  BulkDeletePromptArgs,
} from "../args/prompt.args";
import { promptsTable } from "@/database/schema-alias";
import { and, count, eq, inArray } from "drizzle-orm";
import { eqOrUndefined, getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { ModelNotFoundError, orFail } from "@/database/exceptions";

@Injectable()
export class PromptService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {}

  paginate(options: PromptConnectionArgs) {
    const query = this.db
      .select()
      .from(promptsTable)
      .where((t) =>
        and(eq(t.teamId, options.teamId), eqOrUndefined(t.type, options.type)),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }

  async count(teamId: string) {
    const [{ total }] = await this.db
      .select({ total: count(promptsTable.id) })
      .from(promptsTable)
      .where(eq(promptsTable.teamId, teamId));
    return total || 0;
  }

  async findOneOrFail({ id, teamId }: FindOnePromptArgs) {
    const prompt = await this.db.query.prompts
      .findFirst({
        where: (t) => and(eq(t.id, id), eq(t.teamId, teamId)),
      })
      .then(orFail("prompt"));
    return prompt;
  }

  async create(options: CreatePromptArgs) {
    const [prompt] = await this.db
      .insert(promptsTable)
      .values({
        teamId: options.teamId,
        ...options.input,
      })
      .returning();

    return { prompt };
  }

  async update(options: UpdatePromptArgs) {
    const [prompt] = await this.db
      .update(promptsTable)
      .set(options.input)
      .where(
        and(
          eq(promptsTable.id, options.id),
          eq(promptsTable.teamId, options.teamId),
        ),
      )
      .returning();

    if (!prompt) {
      throw new ModelNotFoundError("prompt not found");
    }

    return { prompt };
  }

  async remove(options: DeletePromptArgs) {
    const [prompt] = await this.db
      .delete(promptsTable)
      .where(
        and(
          eq(promptsTable.id, options.id),
          eq(promptsTable.teamId, options.teamId),
        ),
      )
      .returning({ id: promptsTable.id });

    if (!prompt) {
      throw new ModelNotFoundError("prompt not found");
    }

    return { deletedPromptId: prompt.id };
  }

  async bulkRemove(options: BulkDeletePromptArgs) {
    await this.db
      .delete(promptsTable)
      .where(
        and(
          inArray(promptsTable.id, options.promptIds),
          eq(promptsTable.teamId, options.teamId),
        ),
      );

    return { deletedPromptsCount: options.promptIds.length };
  }
}
