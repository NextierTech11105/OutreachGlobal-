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
      .$type<{
        state?: string;
        city?: string;
        county?: string;
        neighborhood?: string;
        zipCode?: string;
        propertyType?: string;  // residential, commercial, land, etc.
        propertyCode?: string;  // specific MLS/property codes
        filters?: {
          absenteeOwner?: boolean;
          vacant?: boolean;
          preForeclosure?: boolean;
          lisPendens?: boolean;
          minValue?: number;
          maxValue?: number;
        };
        limit?: number;
      }>()
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

    // Batch Job Control
    batchJobEnabled: varchar("batch_job_enabled").default("false"),
    lastBatchJobAt: timestamp("last_batch_job_at"),
    batchJobStatus: varchar("batch_job_status"), // pending, running, completed, failed

    // Optional metadata
    metadata: jsonb().$type<Record<string, any>>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.realEstateSearchId),
    index().on(t.batchJobEnabled),
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
    externalId: varchar("external_id"), // External API ID
    changeType: varchar("change_type"), // 'added', 'updated', 'deleted', null
    lastUpdateDate: timestamp("last_update_date"),

    // Tracking Stats
    firstSeenAt: timestamp("first_seen_at"),
    lastSeenAt: timestamp("last_seen_at"),
    timesFound: varchar("times_found").default("1"), // How many times found in searches

    // Signal Tracking (compounds over time)
    signals: jsonb("signals").$type<{
      absenteeOwner?: boolean;
      vacant?: boolean;
      preForeclosure?: boolean;
      lisPendens?: boolean;
      distressScore?: number;
      equityPercent?: number;
      marketValue?: number;
      lastSaleDate?: string;
      daysOnMarket?: number;
      priceChanges?: Array<{ date: string; price: number }>;
    }>(),

    // Signal History (track changes over time)
    signalHistory: jsonb("signal_history").$type<Array<{
      date: string;
      signals: Record<string, any>;
      changeType?: string;
    }>>(),

    // Lead reference (if we created a lead from this property)
    leadId: ulidColumn(),
    leadCreatedAt: timestamp("lead_created_at"),

    // Full property data snapshot
    propertyData: jsonb("property_data").$type<Record<string, any>>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.savedSearchId),
    index().on(t.propertyId),
    index().on(t.changeType),
    index().on(t.leadId),
  ],
);
