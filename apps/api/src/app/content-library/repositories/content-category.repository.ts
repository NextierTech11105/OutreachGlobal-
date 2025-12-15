import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types/drizzle-client.type";
import {
  contentCategoriesTable,
  contentItemsTable,
} from "@/database/schema-alias";
import { and, eq, isNull, or, count, asc, SQL } from "drizzle-orm";
import {
  ContentCategoryInsert,
  ContentCategorySelect,
} from "../models/content-category.model";

export interface ContentCategoryFilter {
  id?: string;
  teamId?: string | null;
  parentId?: string | null;
  includeSystem?: boolean;
  slug?: string;
}

@Injectable()
export class ContentCategoryRepository {
  constructor(@InjectDB() private db: DrizzleClient) {}

  async findById(id: string): Promise<ContentCategorySelect | undefined> {
    return this.db.query.contentCategories.findFirst({
      where: (t) => eq(t.id, id),
    });
  }

  async findMany(
    filter: ContentCategoryFilter,
  ): Promise<ContentCategorySelect[]> {
    const conditions: SQL<unknown>[] = [];

    // Team filtering: include system (null teamId) + team-specific
    if (filter.teamId) {
      if (filter.includeSystem !== false) {
        conditions.push(
          or(
            eq(contentCategoriesTable.teamId, filter.teamId),
            isNull(contentCategoriesTable.teamId),
          )!,
        );
      } else {
        conditions.push(eq(contentCategoriesTable.teamId, filter.teamId));
      }
    } else if (filter.includeSystem) {
      conditions.push(isNull(contentCategoriesTable.teamId));
    }

    // Parent filtering
    if (filter.parentId === null) {
      conditions.push(isNull(contentCategoriesTable.parentId));
    } else if (filter.parentId) {
      conditions.push(eq(contentCategoriesTable.parentId, filter.parentId));
    }

    return this.db
      .select()
      .from(contentCategoriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        asc(contentCategoriesTable.sortOrder),
        asc(contentCategoriesTable.name),
      );
  }

  async findBySlug(
    slug: string,
    teamId?: string | null,
  ): Promise<ContentCategorySelect | undefined> {
    const conditions = [eq(contentCategoriesTable.slug, slug)];

    if (teamId) {
      conditions.push(
        or(
          eq(contentCategoriesTable.teamId, teamId),
          isNull(contentCategoriesTable.teamId),
        )!,
      );
    }

    return this.db.query.contentCategories.findFirst({
      where: and(...conditions),
    });
  }

  async create(value: ContentCategoryInsert): Promise<ContentCategorySelect> {
    const [category] = await this.db
      .insert(contentCategoriesTable)
      .values(value)
      .returning();
    return category;
  }

  async update(
    id: string,
    value: Partial<ContentCategoryInsert>,
  ): Promise<ContentCategorySelect> {
    const [category] = await this.db
      .update(contentCategoriesTable)
      .set({ ...value, updatedAt: new Date() })
      .where(eq(contentCategoriesTable.id, id))
      .returning();
    return category;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(contentCategoriesTable)
      .where(eq(contentCategoriesTable.id, id));
  }

  async getItemCount(categoryId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(contentItemsTable)
      .where(eq(contentItemsTable.categoryId, categoryId));
    return result[0]?.count ?? 0;
  }

  async getChildren(parentId: string): Promise<ContentCategorySelect[]> {
    return this.db
      .select()
      .from(contentCategoriesTable)
      .where(eq(contentCategoriesTable.parentId, parentId))
      .orderBy(
        asc(contentCategoriesTable.sortOrder),
        asc(contentCategoriesTable.name),
      );
  }
}
