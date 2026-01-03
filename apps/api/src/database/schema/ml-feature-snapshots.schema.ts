/**
 * ML FEATURE SNAPSHOTS SCHEMA
 * ===========================
 * Append-only table for capturing lead features at decision points.
 * Used for offline training and model improvement.
 *
 * Key triggers:
 * - pre_send: Before SMS/email is sent
 * - post_reply: After receiving a reply
 * - state_change: When lead state transitions
 * - milestone: Campaign block completion (2000 leads)
 *
 * Features are computed from signals and stored as JSONB for
 * flexible schema evolution without migrations.
 */

import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

// Primary key prefix
export const ML_FEATURE_SNAPSHOT_PK = "mfs";

// Snapshot triggers
export type SnapshotTrigger =
  | "pre_send" // Before sending outbound message
  | "post_reply" // After receiving reply
  | "state_change" // Lead state transition
  | "milestone" // Campaign block completion
  | "manual"; // Manual capture for debugging

// Outcome labels for supervised training
export type OutcomeLabel =
  | "converted" // Lead booked meeting/closed deal
  | "responded" // Lead replied positively
  | "no_response" // No response after window
  | "opted_out" // Lead opted out
  | "churned" // Lead went cold
  | "wrong_number"; // Invalid contact

/**
 * Feature snapshot structure
 * All features derived from leadSignals and lead metadata
 */
export interface LeadFeatures {
  // Signal counts
  signal_counts: Record<string, number>;

  // Temporal features
  days_since_first_contact?: number;
  days_since_last_contact?: number;
  days_since_last_reply?: number;
  hours_since_last_activity?: number;

  // Engagement metrics
  reply_rate?: number;
  positive_reply_rate?: number;
  avg_response_time_hours?: number;
  total_touches?: number;

  // State tracking
  current_state?: string;
  previous_states?: string[];

  // Lead metadata
  industry?: string;
  source?: string;
  has_email?: boolean;
  has_phone?: boolean;

  // Campaign context
  campaign_id?: string;
  campaign_block?: number;
  template_used?: string;

  // Computed scores
  lead_score?: number;
  intent_score?: number;
  urgency_score?: number;

  // Additional flexible fields
  [key: string]: unknown;
}

/**
 * ML Feature Snapshots Table (Append-Only)
 *
 * Captures lead features at key decision points for:
 * 1. Offline model training
 * 2. Feature importance analysis
 * 3. A/B testing validation
 */
export const mlFeatureSnapshots = pgTable(
  "ml_feature_snapshots",
  {
    id: primaryUlid(ML_FEATURE_SNAPSHOT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Snapshot timing
    snapshotAt: timestamp("snapshot_at")
      .$defaultFn(() => new Date())
      .notNull(),
    snapshotTrigger: varchar("snapshot_trigger")
      .notNull()
      .$type<SnapshotTrigger>(),

    // Lead features (computed from signals)
    features: jsonb().notNull().$type<LeadFeatures>(),

    // Labels for supervised training (filled in later)
    outcomeLabel: varchar("outcome_label").$type<OutcomeLabel>(),
    outcomeAt: timestamp("outcome_at"),

    // Context for reproducibility
    modelVersion: varchar("model_version"), // Which model scored this
    campaignId: varchar("campaign_id"),
    templateId: varchar("template_id"),

    // Immutable - append only (no updatedAt)
    createdAt,
  },
  (t) => [
    // Fast lookup: snapshots for a lead by time
    index("ml_feature_snapshots_lead_time_idx").on(t.leadId, t.snapshotAt),

    // Team scoping
    index("ml_feature_snapshots_team_idx").on(t.teamId),

    // Trigger type analysis
    index("ml_feature_snapshots_trigger_idx").on(t.snapshotTrigger),

    // Training data queries (labeled snapshots)
    index("ml_feature_snapshots_outcome_idx").on(t.outcomeLabel),

    // Campaign analysis
    index("ml_feature_snapshots_campaign_idx").on(t.campaignId),
  ],
);

// Relations
export const mlFeatureSnapshotsRelations = relations(
  mlFeatureSnapshots,
  ({ one }) => ({
    team: one(teams, {
      fields: [mlFeatureSnapshots.teamId],
      references: [teams.id],
    }),
    lead: one(leads, {
      fields: [mlFeatureSnapshots.leadId],
      references: [leads.id],
    }),
  }),
);

// Type exports
export type MlFeatureSnapshot = typeof mlFeatureSnapshots.$inferSelect;
export type NewMlFeatureSnapshot = typeof mlFeatureSnapshots.$inferInsert;
