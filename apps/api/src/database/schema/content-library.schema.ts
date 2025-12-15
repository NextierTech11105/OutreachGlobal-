import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams } from "./teams.schema";
import { users } from "./users.schema";
import {
  ContentItemType,
  ContentVisibility,
  ContentUsedIn,
  ContentVariable,
} from "@nextier/common";

// Primary key prefixes
export const CONTENT_CATEGORY_PK = "ccat";
export const CONTENT_ITEM_PK = "clib";
export const CONTENT_USAGE_LOG_PK = "clog";

// Content Categories - hierarchical structure
export const contentCategories = pgTable(
  "content_categories",
  {
    id: primaryUlid(CONTENT_CATEGORY_PK),
    teamId: ulidColumn().references(() => teams.id, { onDelete: "cascade" }), // null = system/global
    name: varchar().notNull(),
    slug: varchar().notNull(),
    description: text(),
    icon: varchar({ length: 50 }), // lucide icon name
    color: varchar({ length: 20 }),
    parentId: ulidColumn(), // self-reference for hierarchy
    sortOrder: integer().default(0),
    isSystem: boolean().default(false), // system categories can't be deleted
    createdAt,
    updatedAt,
  },
  (t) => [
    index("content_categories_team_id_idx").on(t.teamId),
    index("content_categories_parent_id_idx").on(t.parentId),
    index("content_categories_slug_idx").on(t.slug),
  ],
);

// Content Items - the actual prompts, templates, scripts, etc.
export const contentItems = pgTable(
  "content_items",
  {
    id: primaryUlid(CONTENT_ITEM_PK),
    teamId: ulidColumn().references(() => teams.id, { onDelete: "cascade" }), // null = system/global
    categoryId: ulidColumn().references(() => contentCategories.id, {
      onDelete: "set null",
    }),

    // Content
    title: varchar().notNull(),
    content: text().notNull(),
    description: text(),

    // Organization
    contentType: varchar()
      .notNull()
      .$type<ContentItemType>()
      .default(ContentItemType.PROMPT),
    tags: text().array().default([]),

    // Variables/tokens for personalization
    variables: jsonb().$type<ContentVariable[]>().default([]),

    // Usage tracking
    usageCount: integer().default(0),
    lastUsedAt: timestamp(),

    // Permissions
    visibility: varchar()
      .$type<ContentVisibility>()
      .default(ContentVisibility.TEAM),
    createdById: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    // Status
    isActive: boolean().default(true),
    isFavorite: boolean().default(false),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("content_items_team_id_idx").on(t.teamId),
    index("content_items_category_id_idx").on(t.categoryId),
    index("content_items_content_type_idx").on(t.contentType),
    index("content_items_created_by_id_idx").on(t.createdById),
    index("content_items_is_active_idx").on(t.isActive),
  ],
);

// Usage log for analytics
export const contentUsageLogs = pgTable(
  "content_usage_logs",
  {
    id: primaryUlid(CONTENT_USAGE_LOG_PK),
    contentItemId: ulidColumn()
      .references(() => contentItems.id, { onDelete: "cascade" })
      .notNull(),
    userId: ulidColumn()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    teamId: ulidColumn()
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    usedIn: varchar().$type<ContentUsedIn>(),
    createdAt,
  },
  (t) => [
    index("content_usage_logs_content_item_id_idx").on(t.contentItemId),
    index("content_usage_logs_user_id_idx").on(t.userId),
    index("content_usage_logs_team_id_idx").on(t.teamId),
  ],
);

// Drizzle Relations
export const contentCategoryRelations = relations(
  contentCategories,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [contentCategories.teamId],
      references: [teams.id],
    }),
    parent: one(contentCategories, {
      fields: [contentCategories.parentId],
      references: [contentCategories.id],
      relationName: "categoryHierarchy",
    }),
    children: many(contentCategories, {
      relationName: "categoryHierarchy",
    }),
    items: many(contentItems),
  }),
);

export const contentItemRelations = relations(
  contentItems,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [contentItems.teamId],
      references: [teams.id],
    }),
    category: one(contentCategories, {
      fields: [contentItems.categoryId],
      references: [contentCategories.id],
    }),
    createdBy: one(users, {
      fields: [contentItems.createdById],
      references: [users.id],
    }),
    usageLogs: many(contentUsageLogs),
  }),
);

export const contentUsageLogRelations = relations(
  contentUsageLogs,
  ({ one }) => ({
    contentItem: one(contentItems, {
      fields: [contentUsageLogs.contentItemId],
      references: [contentItems.id],
    }),
    user: one(users, {
      fields: [contentUsageLogs.userId],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [contentUsageLogs.teamId],
      references: [teams.id],
    }),
  }),
);

// Type exports
export type ContentCategorySelect = typeof contentCategories.$inferSelect;
export type ContentCategoryInsert = typeof contentCategories.$inferInsert;
export type ContentItemSelect = typeof contentItems.$inferSelect;
export type ContentItemInsert = typeof contentItems.$inferInsert;
export type ContentUsageLogSelect = typeof contentUsageLogs.$inferSelect;
export type ContentUsageLogInsert = typeof contentUsageLogs.$inferInsert;
