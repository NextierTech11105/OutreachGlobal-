import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

/**
 * Batch Jobs Schema
 *
 * Durable storage for batch processing jobs (CSV imports, skip traces,
 * campaign sends, data enrichment). Replaces in-memory Map storage.
 *
 * Job Types:
 * - csv_import: Import leads/properties from CSV
 * - lead_verification: Verify lead data via external services
 * - campaign_send: Send SMS/voice campaigns in batches
 * - data_enrichment: Enrich leads/properties with external data
 * - skip_trace: Batch skip trace operations
 * - property_detail: Property detail lookups
 */

export const batchJobs = pgTable(
  "batch_jobs",
  {
    id: serial("id").primaryKey(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Job classification
    type: varchar("type", { length: 50 }).notNull(), // csv_import, skip_trace, campaign_send, etc.
    targetEntity: varchar("target_entity", { length: 50 }), // leads, properties

    // Status tracking
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending, processing, completed, failed, paused, scheduled

    // Job configuration (type-specific settings)
    config: jsonb("config").$type<{
      propertyIds?: string[];
      batchSize?: number;
      autoSkipTrace?: boolean;
      pushToValuation?: boolean;
      pushToSmsQueue?: boolean;
      smsTemplate?: string;
      smsAgent?: string;
      campaignId?: string;
    }>(),

    // Progress tracking
    progress: jsonb("progress")
      .$type<{
        total: number;
        processed: number;
        successful: number;
        failed: number;
        withPhones?: number;
        currentBatch?: number;
        totalBatches?: number;
      }>()
      .default({ total: 0, processed: 0, successful: 0, failed: 0 }),

    // Daily usage tracking
    dailyUsage: jsonb("daily_usage").$type<{
      date: string;
      used: number;
      limit: number;
      remaining: number;
    }>(),

    // SMS queue integration results
    smsQueue: jsonb("sms_queue").$type<{
      added: number;
      skipped: number;
      queueIds: string[];
    }>(),

    // Audit fields
    createdBy: varchar("created_by", { length: 255 }),
    scheduledFor: timestamp("scheduled_for"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("batch_jobs_team_idx").on(t.teamId),
    index("batch_jobs_status_idx").on(t.status),
    index("batch_jobs_type_idx").on(t.type),
    index("batch_jobs_scheduled_idx").on(t.scheduledFor),
  ],
);

export const batchJobItems = pgTable(
  "batch_job_items",
  {
    id: serial("id").primaryKey(),
    batchJobId: integer("batch_job_id")
      .references(() => batchJobs.id, { onDelete: "cascade" })
      .notNull(),

    // Item status
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending, processing, completed, failed

    // Input data (JSON for flexibility)
    data: jsonb("data").$type<Record<string, unknown>>(),

    // Output/result data
    result: jsonb("result").$type<Record<string, unknown>>(),

    // Error tracking
    error: text("error"),

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("batch_job_items_job_idx").on(t.batchJobId),
    index("batch_job_items_status_idx").on(t.status),
  ],
);

// Type exports for service usage
export type BatchJob = typeof batchJobs.$inferSelect;
export type NewBatchJob = typeof batchJobs.$inferInsert;
export type BatchJobItem = typeof batchJobItems.$inferSelect;
export type NewBatchJobItem = typeof batchJobItems.$inferInsert;
