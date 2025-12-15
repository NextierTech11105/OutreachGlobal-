import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types/drizzle-client.type";
import {
  contentItemsTable,
  contentUsageLogsTable,
} from "@/database/schema-alias";
import {
  and,
  eq,
  isNull,
  or,
  ilike,
  inArray,
  desc,
  sql,
  gte,
  SQL,
} from "drizzle-orm";
import {
  ContentItemInsert,
  ContentItemSelect,
} from "../models/content-item.model";
import { ContentItemType, ContentUsedIn } from "@nextier/common";

export interface ContentItemFilter {
  id?: string;
  teamId?: string;
  categoryId?: string | null;
  contentType?: ContentItemType;
  searchQuery?: string;
  tags?: string[];
  isActive?: boolean;
  favoritesOnly?: boolean;
  createdById?: string;
}

export interface PaginationOptions {
  first?: number;
  after?: string;
}

@Injectable()
export class ContentItemRepository {
  constructor(@InjectDB() private db: DrizzleClient) {}

  async findById(id: string): Promise<ContentItemSelect | undefined> {
    return this.db.query.contentItems.findFirst({
      where: (t) => eq(t.id, id),
    });
  }

  async findMany(
    filter: ContentItemFilter,
    pagination?: PaginationOptions,
  ): Promise<ContentItemSelect[]> {
    const conditions: SQL<unknown>[] = [];

    // Team filtering: include system (null teamId) + team-specific
    if (filter.teamId) {
      conditions.push(
        or(
          eq(contentItemsTable.teamId, filter.teamId),
          isNull(contentItemsTable.teamId),
        )!,
      );
    }

    // Category filter
    if (filter.categoryId === null) {
      conditions.push(isNull(contentItemsTable.categoryId));
    } else if (filter.categoryId) {
      conditions.push(eq(contentItemsTable.categoryId, filter.categoryId));
    }

    // Content type filter
    if (filter.contentType) {
      conditions.push(eq(contentItemsTable.contentType, filter.contentType));
    }

    // Search query
    if (filter.searchQuery) {
      const searchPattern = `%${filter.searchQuery}%`;
      conditions.push(
        or(
          ilike(contentItemsTable.title, searchPattern),
          ilike(contentItemsTable.content, searchPattern),
          ilike(contentItemsTable.description, searchPattern),
        )!,
      );
    }

    // Active filter
    if (filter.isActive !== undefined) {
      conditions.push(eq(contentItemsTable.isActive, filter.isActive));
    }

    // Favorites only
    if (filter.favoritesOnly) {
      conditions.push(eq(contentItemsTable.isFavorite, true));
    }

    // Created by filter
    if (filter.createdById) {
      conditions.push(eq(contentItemsTable.createdById, filter.createdById));
    }

    let query = this.db
      .select()
      .from(contentItemsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contentItemsTable.updatedAt));

    if (pagination?.first) {
      query = query.limit(pagination.first) as typeof query;
    }

    return query;
  }

  async create(value: ContentItemInsert): Promise<ContentItemSelect> {
    const [item] = await this.db
      .insert(contentItemsTable)
      .values(value)
      .returning();
    return item;
  }

  async update(
    id: string,
    value: Partial<ContentItemInsert>,
  ): Promise<ContentItemSelect> {
    const [item] = await this.db
      .update(contentItemsTable)
      .set({ ...value, updatedAt: new Date() })
      .where(eq(contentItemsTable.id, id))
      .returning();
    return item;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(contentItemsTable).where(eq(contentItemsTable.id, id));
  }

  async incrementUsageCount(id: string): Promise<ContentItemSelect> {
    const [item] = await this.db
      .update(contentItemsTable)
      .set({
        usageCount: sql`${contentItemsTable.usageCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentItemsTable.id, id))
      .returning();
    return item;
  }

  async toggleFavorite(id: string): Promise<ContentItemSelect> {
    const item = await this.findById(id);
    if (!item) {
      throw new Error("Content item not found");
    }

    const [updated] = await this.db
      .update(contentItemsTable)
      .set({
        isFavorite: !item.isFavorite,
        updatedAt: new Date(),
      })
      .where(eq(contentItemsTable.id, id))
      .returning();
    return updated;
  }

  async logUsage(
    contentItemId: string,
    userId: string,
    teamId: string,
    usedIn: ContentUsedIn,
  ): Promise<void> {
    await this.db.insert(contentUsageLogsTable).values({
      contentItemId,
      userId,
      teamId,
      usedIn,
    });
  }

  async getUsageCount(contentItemId: string, since?: Date): Promise<number> {
    const conditions = [eq(contentUsageLogsTable.contentItemId, contentItemId)];

    if (since) {
      conditions.push(gte(contentUsageLogsTable.createdAt, since));
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(contentUsageLogsTable)
      .where(and(...conditions));

    return Number(result[0]?.count ?? 0);
  }
}
