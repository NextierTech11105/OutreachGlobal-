import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: primaryUlid("ss"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    searchName: varchar("search_name").notNull(),
    searchQuery: jsonb("search_query")
      .$type<Record<string, any>>()
      .notNull(),

    // RealEstateAPI saved search ID
    realEstateSearchId: varchar("realestate_search_id"),

    // Tracking
    lastReportDate: timestamp("last_report_date"),
    nextReportDate: timestamp("next_report_date"),

    // Stats from last update
    totalProperties: varchar("total_properties"),
    addedCount: varchar("added_count"),
    deletedCount: varchar("deleted_count"),
    updatedCount: varchar("updated_count"),

    // Optional metadata
    metadata: jsonb().$type<Record<string, any>>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.realEstateSearchId),
  ],
);

export const savedSearchResults = pgTable(
  "saved_search_results",
  {
    id: primaryUlid("ssr"),
    savedSearchId: ulidColumn()
      .references(() => savedSearches.id, {
        onDelete: "cascade",
      })
      .notNull(),

    // Property tracking
    propertyId: varchar("property_id").notNull(), // RealEstateAPI property ID
    changeType: varchar("change_type"), // 'added', 'updated', 'deleted', null
    lastUpdateDate: timestamp("last_update_date"),

    // Lead reference (if we created a lead from this property)
    leadId: ulidColumn(),

    // Full property data snapshot
    propertyData: jsonb("property_data").$type<Record<string, any>>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.savedSearchId),
    index().on(t.propertyId),
    index().on(t.changeType),
  ],
);
