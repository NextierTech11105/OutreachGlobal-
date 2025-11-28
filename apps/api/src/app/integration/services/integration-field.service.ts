import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { integrationFieldsTable } from "@/database/schema-alias";
import { IntegrationField } from "../models/integration-field.model";
import {
  FindIntegrationFieldsArgs,
  UpsertIntegrationFieldsArgs,
} from "../args/integration-field.args";
import { and, eq, sql } from "drizzle-orm";

@Injectable()
export class IntegrationFieldService {
  constructor(@InjectDB() private db: DrizzleClient) {}

  findMany(options: Omit<FindIntegrationFieldsArgs, "teamId">) {
    return this.db.query.integrationFields.findMany({
      where: (t) =>
        and(
          eq(t.integrationId, options.integrationId),
          eq(t.moduleName, options.moduleName),
        ),
    });
  }

  async upsert(args: UpsertIntegrationFieldsArgs): Promise<IntegrationField[]> {
    const { integrationId, moduleName, fields } = args;

    // If no fields provided, return empty array
    if (!fields.length) {
      return [];
    }

    // Prepare the fields for insertion
    const fieldsToInsert = fields.map((field) => ({
      integrationId,
      moduleName,
      sourceField: field.sourceField,
      targetField: field.targetField,
      subField: field.subField || null,
      metadata: field.metadata || null,
    }));

    // Perform the upsert operation with onConflict do update and return results
    const upsertedFields = await this.db
      .insert(integrationFieldsTable)
      .values(fieldsToInsert)
      .onConflictDoUpdate({
        target: [
          integrationFieldsTable.integrationId,
          integrationFieldsTable.moduleName,
          integrationFieldsTable.sourceField,
        ],
        set: {
          targetField: sql`excluded.target_field`,
          subField: sql`excluded.sub_field`,
          metadata: sql`excluded.metadata`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return upsertedFields;
  }
}
