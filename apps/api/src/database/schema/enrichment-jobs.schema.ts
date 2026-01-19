/**
 * LUCI Engine: Data Lake + Enrichment Jobs
 *
 * ARCHITECTURE:
 * - Data Lake: Unlimited imports (300k, whatever) - raw storage
 * - Enrichment Blocks: 10k capacity each - on-demand processing
 * - Sub-blocks: 500/1k/2k per day - pay-per-trace
 *
 * Import 300k → Lake. Enrich on-demand in daily sub-blocks.
 */

import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// ═══════════════════════════════════════════════════════════════════════════
// DATA LAKE: Unlimited raw imports
// ═══════════════════════════════════════════════════════════════════════════

export const dataLakeImports = pgTable(
  "data_lake_imports",
  {
    id: primaryUlid("lake"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Import metadata
    fileName: text().notNull(),
    fileSize: integer(), // bytes
    totalRecords: integer().notNull(),
    importedRecords: integer().default(0),
    failedRecords: integer().default(0),

    // Source tracking
    sourceType: varchar({ length: 30 }).default("usbizdata"), // usbizdata, apollo, custom
    sectorTag: varchar({ length: 50 }),
    sicCode: varchar({ length: 10 }),

    // Storage location (DO Spaces)
    storagePath: text(), // nextier-data/lake/team-xxx/import-yyy.csv

    // Status
    status: varchar({ length: 20 }).default("pending"), // pending, processing, completed, failed
    errorMessage: text(),

    // Counts by enrichment status
    rawCount: integer().default(0), // Not yet enriched
    enrichedCount: integer().default(0), // Pulled into enrichment block

    createdAt,
    updatedAt,
  },
  (t) => [
    index("data_lake_imports_team_idx").on(t.teamId),
    index("data_lake_imports_status_idx").on(t.status),
    index("data_lake_imports_sector_idx").on(t.sectorTag),
  ],
);

// ═══════════════════════════════════════════════════════════════════════════
// ENRICHMENT JOBS: Track pipeline processing
// ═══════════════════════════════════════════════════════════════════════════

export const enrichmentJobStatusEnum = pgEnum("enrichment_job_status", [
  "pending",
  "active",
  "importing",
  "tracing",
  "scoring",
  "qualifying",
  "completed",
  "failed",
]);

export const enrichmentJobTypeEnum = pgEnum("enrichment_job_type", [
  "import",
  "skip_trace",
  "score",
  "qualify",
  "full_pipeline",
  "block",
  "sub-block",
]);

export const enrichmentJobs = pgTable(
  "enrichment_jobs",
  {
    id: primaryUlid("ej"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Job metadata
    jobType: enrichmentJobTypeEnum("job_type").notNull(),
    status: enrichmentJobStatusEnum("status").default("pending"),

    // Source info
    sourceFile: text(),
    sectorTag: varchar({ length: 50 }),
    sicCode: varchar({ length: 10 }),

    // Progress tracking
    totalRecords: integer().default(0),
    processedRecords: integer().default(0),
    successRecords: integer().default(0),
    failedRecords: integer().default(0),

    // Tracerfy integration
    tracerfyQueueId: integer(),
    tracerfyDownloadUrl: text(),

    // Block tracking
    blockId: varchar({ length: 20 }),
    subBlockId: varchar({ length: 20 }),

    // Timing
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),

    // Error handling
    errorMessage: text(),
    errorDetails: text(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("enrichment_jobs_team_idx").on(t.teamId),
    index("enrichment_jobs_status_idx").on(t.status),
    index("enrichment_jobs_type_idx").on(t.jobType),
    index("enrichment_jobs_tracerfy_idx").on(t.tracerfyQueueId),
    index("enrichment_jobs_block_idx").on(t.blockId),
  ],
);

// Block tracking for 10k block system
export const enrichmentBlocks = pgTable(
  "enrichment_blocks",
  {
    id: primaryUlid("block"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Block identity
    blockNumber: integer().notNull(),
    blockId: varchar({ length: 20 }).notNull(), // block-001, block-002

    // Capacity tracking (10k max)
    capacity: integer().notNull().default(10000),
    rawCount: integer().default(0),
    tracedCount: integer().default(0),
    scoredCount: integer().default(0),
    readyCount: integer().default(0),
    rejectedCount: integer().default(0),

    // Storage paths (DO Spaces)
    rawPath: text(),
    tracedPath: text(),
    scoredPath: text(),
    readyPath: text(),

    // Status
    status: varchar({ length: 20 }).default("active"), // active, full, archived

    createdAt,
    updatedAt,
  },
  (t) => [
    index("enrichment_blocks_team_idx").on(t.teamId),
    index("enrichment_blocks_status_idx").on(t.status),
    index("enrichment_blocks_block_id_idx").on(t.blockId),
  ],
);

// Sub-block tracking for daily batches (500/1k/2k)
export const enrichmentSubBlocks = pgTable(
  "enrichment_sub_blocks",
  {
    id: primaryUlid("subblock"),
    blockId: ulidColumn().notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Sub-block identity
    subBlockNumber: integer().notNull(),
    subBlockId: varchar({ length: 30 }).notNull(), // block-001-sub-001

    // Daily target
    dailyTarget: integer().notNull(), // 500, 1000, or 2000
    processedCount: integer().default(0),
    campaignReadyCount: integer().default(0),

    // Status
    status: varchar({ length: 20 }).default("pending"), // pending, processing, completed

    // Date tracking
    targetDate: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("enrichment_sub_blocks_block_idx").on(t.blockId),
    index("enrichment_sub_blocks_team_idx").on(t.teamId),
    index("enrichment_sub_blocks_status_idx").on(t.status),
  ],
);
