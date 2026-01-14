/**
 * AUDIENCE BUILDER SCHEMA
 *
 * Growth OS Module: Audience Builder & List Management
 *
 * Purpose:
 * - Build dynamic segments from ICP criteria
 * - Create static and dynamic lists
 * - Track list membership and changes
 * - Support suppression lists for compliance
 *
 * Flow:
 * ICP Criteria → Segment Rules → Audience Membership → Campaign Targeting
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// =============================================================================
// AUDIENCES (Segments)
// =============================================================================

export const AUDIENCE_PK = "aud";

export type AudienceType = "dynamic" | "static" | "suppression";
export type AudienceStatus = "building" | "ready" | "updating" | "error";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "between"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "before"
  | "after"
  | "within_days";

export interface AudienceFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  logicalOperator?: "AND" | "OR";
}

export interface AudienceFilterGroup {
  filters: AudienceFilter[];
  logicalOperator: "AND" | "OR";
}

/**
 * Audience - a segment of leads for targeting
 */
export const audiences = pgTable(
  "audiences",
  {
    id: primaryUlid(AUDIENCE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    name: varchar({ length: 255 }).notNull(),
    description: text(),
    type: varchar({ length: 20 }).notNull().$type<AudienceType>(),
    status: varchar({ length: 20 }).default("building").$type<AudienceStatus>(),

    // === Filter Configuration (for dynamic audiences) ===
    filterGroups: jsonb("filter_groups").$type<AudienceFilterGroup[]>(),

    // === ICP Link (optional - inherit filters from ICP) ===
    icpId: ulidColumn("icp_id"),

    // === Membership Stats ===
    memberCount: integer("member_count").default(0),
    lastCalculatedAt: timestamp("last_calculated_at"),
    estimatedSize: integer("estimated_size"), // For preview before building

    // === Refresh Settings (for dynamic audiences) ===
    autoRefresh: boolean("auto_refresh").default(true),
    refreshIntervalHours: integer("refresh_interval_hours").default(24),
    lastRefreshedAt: timestamp("last_refreshed_at"),
    nextRefreshAt: timestamp("next_refresh_at"),

    // === Suppression Settings ===
    isGlobalSuppression: boolean("is_global_suppression").default(false),
    suppressionReason: varchar("suppression_reason", { length: 255 }),

    // === Audit ===
    createdBy: ulidColumn("created_by"),
    isActive: boolean("is_active").default(true),
    isArchived: boolean("is_archived").default(false),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("aud_team_idx").on(t.teamId),
    index("aud_type_idx").on(t.teamId, t.type),
    index("aud_status_idx").on(t.status),
    index("aud_icp_idx").on(t.icpId),
    index("aud_active_idx").on(t.teamId, t.isActive),
  ],
);

// =============================================================================
// AUDIENCE MEMBERS
// =============================================================================

export const AUDIENCE_MEMBER_PK = "aum";

export type MembershipSource = "filter" | "manual" | "import" | "api";

/**
 * Audience Members - tracks which leads belong to which audiences
 */
export const audienceMembers = pgTable(
  "audience_members",
  {
    id: primaryUlid(AUDIENCE_MEMBER_PK),
    audienceId: ulidColumn("audience_id").notNull(),
    leadId: ulidColumn("lead_id").notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Membership Details ===
    source: varchar({ length: 20 }).default("filter").$type<MembershipSource>(),
    addedAt: timestamp("added_at").defaultNow(),
    addedBy: ulidColumn("added_by"), // User who added (for manual adds)

    // === For static lists - track removal ===
    removedAt: timestamp("removed_at"),
    removedBy: ulidColumn("removed_by"),
    removalReason: varchar("removal_reason", { length: 255 }),

    // === Suppression tracking ===
    isSuppressed: boolean("is_suppressed").default(false),
    suppressedAt: timestamp("suppressed_at"),
    suppressionSource: varchar("suppression_source", { length: 100 }),

    createdAt,
  },
  (t) => [
    index("aum_audience_idx").on(t.audienceId),
    index("aum_lead_idx").on(t.leadId),
    index("aum_team_idx").on(t.teamId),
    uniqueIndex("aum_audience_lead_unique").on(t.audienceId, t.leadId),
  ],
);

// =============================================================================
// AUDIENCE SNAPSHOTS (Point-in-time captures)
// =============================================================================

export const AUDIENCE_SNAPSHOT_PK = "asn";

/**
 * Audience Snapshots - historical record of audience membership
 */
export const audienceSnapshots = pgTable(
  "audience_snapshots",
  {
    id: primaryUlid(AUDIENCE_SNAPSHOT_PK),
    audienceId: ulidColumn("audience_id").notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Snapshot Details ===
    snapshotAt: timestamp("snapshot_at").defaultNow(),
    memberCount: integer("member_count").notNull(),
    filterHash: varchar("filter_hash", { length: 64 }), // Hash of filter config

    // === Changes from previous snapshot ===
    addedCount: integer("added_count").default(0),
    removedCount: integer("removed_count").default(0),

    // === Trigger ===
    triggeredBy: varchar("triggered_by", { length: 50 }), // 'scheduled', 'manual', 'campaign_start'

    createdAt,
  },
  (t) => [
    index("asn_audience_idx").on(t.audienceId),
    index("asn_team_idx").on(t.teamId),
    index("asn_snapshot_at_idx").on(t.snapshotAt),
  ],
);

// =============================================================================
// LIST IMPORTS
// =============================================================================

export const LIST_IMPORT_PK = "lim";

export type ImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * List Imports - track bulk imports into static lists
 */
export const listImports = pgTable(
  "list_imports",
  {
    id: primaryUlid(LIST_IMPORT_PK),
    audienceId: ulidColumn("audience_id").notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    importedBy: ulidColumn("imported_by"),

    // === Import Details ===
    fileName: varchar("file_name", { length: 255 }),
    fileUrl: text("file_url"),
    status: varchar({ length: 20 }).default("pending").$type<ImportStatus>(),

    // === Stats ===
    totalRows: integer("total_rows").default(0),
    processedRows: integer("processed_rows").default(0),
    successCount: integer("success_count").default(0),
    errorCount: integer("error_count").default(0),
    duplicateCount: integer("duplicate_count").default(0),

    // === Error Details ===
    errors: jsonb("errors").$type<
      Array<{
        row: number;
        field: string;
        error: string;
      }>
    >(),

    // === Timing ===
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("lim_audience_idx").on(t.audienceId),
    index("lim_team_idx").on(t.teamId),
    index("lim_status_idx").on(t.status),
  ],
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Audience = typeof audiences.$inferSelect;
export type NewAudience = typeof audiences.$inferInsert;

export type AudienceMember = typeof audienceMembers.$inferSelect;
export type NewAudienceMember = typeof audienceMembers.$inferInsert;

export type AudienceSnapshot = typeof audienceSnapshots.$inferSelect;
export type NewAudienceSnapshot = typeof audienceSnapshots.$inferInsert;

export type ListImport = typeof listImports.$inferSelect;
export type NewListImport = typeof listImports.$inferInsert;

// =============================================================================
// FILTER FIELD DEFINITIONS
// =============================================================================

export const AUDIENCE_FILTER_FIELDS = {
  // Lead fields
  "lead.stage": { type: "select", label: "Lead Stage" },
  "lead.status": { type: "select", label: "Lead Status" },
  "lead.source": { type: "text", label: "Lead Source" },
  "lead.createdAt": { type: "date", label: "Created Date" },
  "lead.lastContactedAt": { type: "date", label: "Last Contacted" },

  // Company fields
  "company.industry": { type: "text", label: "Industry" },
  "company.size": { type: "select", label: "Company Size" },
  "company.revenue": { type: "number", label: "Revenue" },
  "company.state": { type: "text", label: "State" },
  "company.city": { type: "text", label: "City" },

  // Contact fields
  "contact.title": { type: "text", label: "Job Title" },
  "contact.department": { type: "text", label: "Department" },
  "contact.seniority": { type: "select", label: "Seniority" },

  // Engagement fields
  "engagement.emailOpened": { type: "boolean", label: "Email Opened" },
  "engagement.smsReplied": { type: "boolean", label: "SMS Replied" },
  "engagement.meetingBooked": { type: "boolean", label: "Meeting Booked" },
  "engagement.callCompleted": { type: "boolean", label: "Call Completed" },

  // ICP fields
  "icp.score": { type: "number", label: "ICP Score" },
  "icp.qualified": { type: "boolean", label: "ICP Qualified" },

  // Tag fields
  "tags.has": { type: "text", label: "Has Tag" },
  "tags.notHas": { type: "text", label: "Does Not Have Tag" },
} as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Validate a filter configuration
 */
export function validateFilter(filter: AudienceFilter): boolean {
  if (!filter.field || !filter.operator) return false;

  const nullOperators: FilterOperator[] = ["is_null", "is_not_null"];
  if (nullOperators.includes(filter.operator)) {
    return true; // No value needed
  }

  return filter.value !== undefined && filter.value !== null;
}

/**
 * Generate a hash of filter configuration for change detection
 */
export function hashFilterConfig(filterGroups: AudienceFilterGroup[]): string {
  const str = JSON.stringify(filterGroups);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}
