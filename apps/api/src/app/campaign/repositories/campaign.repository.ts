import { InjectDB } from "@/database/decorators";
import { DrizzleClient, WithSessionOptions } from "@/database/types";
import { Injectable } from "@nestjs/common";
import { and, eq, ilike } from "drizzle-orm";
import {
  eqOrUndefined,
  getDatabaseSession,
} from "@haorama/drizzle-postgres-extra";
import { campaignsTable } from "@/database/schema-alias";
import { CampaignFilter } from "../types/campaign.type.ts";
import { CampaignInsert } from "../models/campaign.model";
import { PgUpdateSetSource } from "drizzle-orm/pg-core/index.js";

@Injectable()
export class CampaignRepository {
  constructor(@InjectDB() private db: DrizzleClient) {}

  findById(filter: CampaignFilter) {
    return this.db.query.campaigns.findFirst({
      where: (t) =>
        and(
          eqOrUndefined(t.id, filter.id),
          eqOrUndefined(t.teamId, filter.teamId),
        ),
    });
  }

  findMany(filter: CampaignFilter) {
    return this.db
      .select()
      .from(campaignsTable)
      .where((t) =>
        and(
          eqOrUndefined(t.teamId, filter.teamId),
          !filter.searchQuery
            ? undefined
            : ilike(t.name, `%${filter.searchQuery}%`),
        ),
      );
  }

  async create(value: CampaignInsert, options?: WithSessionOptions) {
    const tx = getDatabaseSession(this.db, options?.session);
    const [campaign] = await tx
      .insert(campaignsTable)
      .values(value)
      .returning();

    return campaign;
  }

  async update(
    filter: CampaignFilter,
    value: PgUpdateSetSource<typeof campaignsTable>,
    options?: WithSessionOptions,
  ) {
    const tx = getDatabaseSession(this.db, options?.session);
    const [campaign] = await tx
      .update(campaignsTable)
      .set(value)
      .where(
        and(
          eqOrUndefined(campaignsTable.id, filter.id),
          eqOrUndefined(campaignsTable.teamId, filter.teamId),
        ),
      )
      .returning();

    return campaign;
  }

  async remove(filter: CampaignFilter, options?: WithSessionOptions) {
    const tx = getDatabaseSession(this.db, options?.session);
    const [campaign] = await tx
      .delete(campaignsTable)
      .where(
        and(
          eqOrUndefined(campaignsTable.id, filter.id),
          eqOrUndefined(campaignsTable.teamId, filter.teamId),
        ),
      )
      .returning();

    return campaign;
  }
}
