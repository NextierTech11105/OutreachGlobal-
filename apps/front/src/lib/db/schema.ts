import { pgTable, text, timestamp, jsonb, integer, boolean, uuid } from "drizzle-orm/pg-core";

// Saved property searches
export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  query: jsonb("query").notNull(), // PropertySearchQuery JSON
  resultCount: integer("result_count").default(0),
  isActive: boolean("is_active").default(true),
  notifyOnChanges: boolean("notify_on_changes").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastRunAt: timestamp("last_run_at"),
});

// Property IDs tracked by saved searches
export const savedSearchPropertyIds = pgTable("saved_search_property_ids", {
  id: uuid("id").primaryKey().defaultRandom(),
  savedSearchId: uuid("saved_search_id").notNull().references(() => savedSearches.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"),
  isActive: boolean("is_active").default(true),
});

// Change events when properties enter/leave saved searches
export const propertyChangeEvents = pgTable("property_change_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  savedSearchId: uuid("saved_search_id").notNull().references(() => savedSearches.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull(),
  eventType: text("event_type").notNull(), // 'added' | 'removed'
  propertySnapshot: jsonb("property_snapshot"), // Store property data at time of event
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports for TypeScript
export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;
export type SavedSearchPropertyId = typeof savedSearchPropertyIds.$inferSelect;
export type PropertyChangeEvent = typeof propertyChangeEvents.$inferSelect;
