import { BadRequestException, Injectable } from "@nestjs/common";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { and, eq, ilike } from "drizzle-orm";
import { getCursorOrder } from "@haorama/drizzle-postgres-extra";
import { DrizzleClient } from "@/database/types";
import { InjectDB } from "@/database/decorators";
import { DatabaseService } from "@/database/services/database.service";
import { messageTemplatesTable } from "@/database/schema-alias";
import { orFail } from "@/database/exceptions";
import { ResourceConnectionArgs } from "./resource.args";

type Columns = { id: PgColumn; label: PgColumn; teamId: PgColumn } & Record<
  string,
  PgColumn
>;

type AvailableResources = Record<
  string,
  {
    table: PgTable;
    columns: Columns;
  }
>;

@Injectable()
export class ResourceService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private dbService: DatabaseService,
  ) {}

  private get availableResources(): AvailableResources {
    return {
      messageTemplates: {
        table: messageTemplatesTable,
        columns: {
          id: messageTemplatesTable.id,
          label: messageTemplatesTable.name,
          teamId: messageTemplatesTable.teamId,
          type: messageTemplatesTable.type,
        },
      },
    };
  }

  async getResourceId(name: string, id: string) {
    const resource = this.availableResources[name];

    if (!resource) {
      throw new BadRequestException(`invalid resource type: ${name}`);
    }

    const [result] = await this.db
      .select({
        id: resource.columns.id,
      })
      .from(resource.table)
      .where(eq(resource.columns.id, id))
      .limit(1)
      .then(orFail("resource"));

    return result.id;
  }

  paginate(options: ResourceConnectionArgs) {
    const resource = this.availableResources[options.type];

    if (!resource) {
      throw new BadRequestException(`invalid resource type: ${options.type}`);
    }

    const query = this.db
      .select(resource.columns)
      .from(resource.table)
      .where((t) =>
        and(
          eq(resource.columns.teamId, options.teamId),
          !options.search ? undefined : ilike(t.label, options.search),
        ),
      )
      .$dynamic();

    return this.dbService.withCursorPagination(query, {
      ...options,
      cursors: (t) => [getCursorOrder(t.id, true)],
    });
  }
}
