/**
 * ML PREDICTIONS SCHEMA
 * =====================
 * Append-only table for storing ML predictions and tracking accuracy.
 * Also includes campaign block tracking for the core 10K execution pattern.
 *
 * Core Execution Pattern:
 * - 2,000 leads per campaign block
 * - 5 touches per lead max
 * - 10,000 sends per block (2K × 5)
 * - PAUSE & PIVOT at block completion
 * - Capture metrics, then REPEAT
 *
 * Predictions are ADVISORY only - human approval required for all actions.
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

// ============================================
// ML PREDICTIONS TABLE
// ============================================

export const ML_PREDICTION_PK = "mlp";

// Model types
export type ModelName =
  | "lead_priority" // Lead scoring/prioritization
  | "response_likelihood" // Probability of reply
  | "send_time" // Optimal send time
  | "template_score" // Template recommendation
  | "channel_preference" // SMS vs Email vs Call
  | "touch_limit"; // Remaining touches prediction

// Human actions on predictions
export type HumanAction =
  | "accepted" // Used the prediction
  | "rejected" // Ignored/overrode
  | "modified" // Partially used
  | "ignored"; // No action taken

/**
 * Prediction output structure
 */
export interface PredictionOutput {
  // Lead scoring
  score?: number;
  recommendation?: string;

  // Response prediction
  response_probability?: number;

  // Send time
  recommended_send_time?: string;
  send_window?: { start: string; end: string };

  // Template
  recommended_template?: string;
  template_scores?: Record<string, number>;

  // Channel
  recommended_channel?: "sms" | "email" | "call";
  channel_scores?: Record<string, number>;

  // Confidence
  confidence?: number;
  reasoning?: string;

  // Touch tracking
  touches_remaining?: number;
  should_pivot?: boolean;
  pivot_to?: string;

  [key: string]: unknown;
}

/**
 * ML Predictions Table (Append-Only)
 */
export const mlPredictions = pgTable(
  "ml_predictions",
  {
    id: primaryUlid(ML_PREDICTION_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Prediction metadata
    modelName: varchar("model_name").notNull().$type<ModelName>(),
    modelVersion: varchar("model_version").notNull(),

    // Prediction output
    prediction: jsonb().notNull().$type<PredictionOutput>(),

    // Human decision tracking
    humanAction: varchar("human_action").$type<HumanAction>(),
    humanActionAt: timestamp("human_action_at"),
    humanActionBy: ulidColumn("human_action_by"),

    // Outcome tracking (for model accuracy)
    actualOutcome: varchar("actual_outcome"),
    actualOutcomeAt: timestamp("actual_outcome_at"),

    // Campaign context
    campaignId: varchar("campaign_id"),
    campaignBlockId: varchar("campaign_block_id"),
    touchNumber: integer("touch_number"), // 1-5

    // Immutable
    createdAt,
  },
  (t) => [
    // Fast lookup: predictions for a lead
    index("ml_predictions_lead_idx").on(t.leadId, t.createdAt),

    // Team scoping
    index("ml_predictions_team_idx").on(t.teamId),

    // Model analysis
    index("ml_predictions_model_idx").on(t.modelName, t.modelVersion),

    // Accuracy tracking (predictions with outcomes)
    index("ml_predictions_outcome_idx").on(t.actualOutcome),

    // Campaign block queries
    index("ml_predictions_block_idx").on(t.campaignBlockId),

    // Human action analysis
    index("ml_predictions_action_idx").on(t.humanAction),
  ],
);

// ============================================
// CAMPAIGN BLOCKS TABLE - CORE 10K PATTERN
// ============================================

export const CAMPAIGN_BLOCK_PK = "cblk";

// Block status
export type CampaignBlockStatus =
  | "preparing" // Loading leads
  | "active" // Executing touches
  | "paused" // Manually paused
  | "completed" // All 10K sends done
  | "pivoted"; // Pivoted to next campaign/channel

/**
 * Campaign Blocks Table
 *
 * Tracks the core execution pattern:
 * - 2,000 leads per block
 * - 5 touches per lead
 * - 10,000 total sends
 * - Metrics at completion
 */
export const campaignBlocks = pgTable(
  "campaign_blocks",
  {
    id: primaryUlid(CAMPAIGN_BLOCK_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Campaign reference
    campaignId: varchar("campaign_id").notNull(),
    campaignName: varchar("campaign_name"),
    blockNumber: integer("block_number").notNull().default(1),

    // Block configuration
    maxLeads: integer("max_leads").notNull().default(2000),
    maxTouchesPerLead: integer("max_touches_per_lead").notNull().default(5),
    targetSends: integer("target_sends").notNull().default(10000), // 2000 × 5

    // Current progress
    leadsLoaded: integer("leads_loaded").notNull().default(0),
    totalTouches: integer("total_touches").notNull().default(0),
    currentTouch: integer("current_touch").notNull().default(1), // 1-5

    // Status
    status: varchar()
      .notNull()
      .$type<CampaignBlockStatus>()
      .default("preparing"),

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    pausedAt: timestamp("paused_at"),
    pivotedAt: timestamp("pivoted_at"),

    // Pivot tracking
    pivotTo: varchar("pivot_to"), // Next campaign or channel
    pivotReason: varchar("pivot_reason"),

    // Key metrics at completion (THE NUMBERS GAME)
    metrics: jsonb().$type<{
      // Delivery
      total_sent: number;
      total_delivered: number;
      delivery_rate: number;

      // Engagement
      total_replies: number;
      positive_replies: number;
      negative_replies: number;
      reply_rate: number;
      positive_rate: number;

      // Conversions
      emails_captured: number;
      calls_scheduled: number;
      meetings_booked: number;

      // Suppression
      opt_outs: number;
      wrong_numbers: number;
      opt_out_rate: number;

      // By touch (1-5)
      by_touch: Array<{
        touch: number;
        sent: number;
        delivered: number;
        replies: number;
        conversions: number;
      }>;

      // Cost
      total_cost_cents: number;
      cost_per_reply_cents: number;
      cost_per_conversion_cents: number;
    }>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    // Unique: one block number per campaign
    uniqueIndex("campaign_blocks_campaign_block_idx").on(
      t.campaignId,
      t.blockNumber,
    ),

    // Team scoping
    index("campaign_blocks_team_idx").on(t.teamId),

    // Status queries
    index("campaign_blocks_status_idx").on(t.status),

    // Active blocks
    index("campaign_blocks_active_idx").on(t.teamId, t.status),
  ],
);

// ============================================
// LEAD TOUCH TRACKING
// ============================================

export const LEAD_TOUCH_PK = "ltch";

/**
 * Lead Touches Table
 *
 * Tracks individual touches per lead within a campaign block.
 * Enforces the 5-touch max rule.
 */
export const leadTouches = pgTable(
  "lead_touches",
  {
    id: primaryUlid(LEAD_TOUCH_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Campaign block reference
    campaignBlockId: ulidColumn("campaign_block_id")
      .references(() => campaignBlocks.id, { onDelete: "cascade" })
      .notNull(),

    // Touch tracking
    touchNumber: integer("touch_number").notNull(), // 1-5
    channel: varchar().notNull().default("sms"), // sms, email, call

    // Message details
    templateId: varchar("template_id"),
    messageId: varchar("message_id"), // SignalHouse message ID

    // Status
    status: varchar().notNull().default("pending"), // pending, sent, delivered, failed
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),

    // Response tracking
    replied: integer().default(0), // 0 or 1
    repliedAt: timestamp("replied_at"),
    replyIntent: varchar("reply_intent"), // positive, negative, question, opt_out

    // Pivot flag
    shouldPivot: integer("should_pivot").default(0), // Set to 1 after touch 5

    createdAt,
  },
  (t) => [
    // Unique: one touch number per lead per block
    uniqueIndex("lead_touches_lead_block_touch_idx").on(
      t.leadId,
      t.campaignBlockId,
      t.touchNumber,
    ),

    // Fast lookup: touches for a lead
    index("lead_touches_lead_idx").on(t.leadId),

    // Block queries
    index("lead_touches_block_idx").on(t.campaignBlockId),

    // Touch number queries (for batch processing)
    index("lead_touches_touch_num_idx").on(t.campaignBlockId, t.touchNumber),

    // Pivot queries
    index("lead_touches_pivot_idx").on(t.shouldPivot),
  ],
);

// ============================================
// RELATIONS
// ============================================

export const mlPredictionsRelations = relations(mlPredictions, ({ one }) => ({
  team: one(teams, {
    fields: [mlPredictions.teamId],
    references: [teams.id],
  }),
  lead: one(leads, {
    fields: [mlPredictions.leadId],
    references: [leads.id],
  }),
}));

export const campaignBlocksRelations = relations(
  campaignBlocks,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [campaignBlocks.teamId],
      references: [teams.id],
    }),
    touches: many(leadTouches),
  }),
);

export const leadTouchesRelations = relations(leadTouches, ({ one }) => ({
  team: one(teams, {
    fields: [leadTouches.teamId],
    references: [teams.id],
  }),
  lead: one(leads, {
    fields: [leadTouches.leadId],
    references: [leads.id],
  }),
  campaignBlock: one(campaignBlocks, {
    fields: [leadTouches.campaignBlockId],
    references: [campaignBlocks.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type MlPrediction = typeof mlPredictions.$inferSelect;
export type NewMlPrediction = typeof mlPredictions.$inferInsert;

export type CampaignBlock = typeof campaignBlocks.$inferSelect;
export type NewCampaignBlock = typeof campaignBlocks.$inferInsert;

export type LeadTouch = typeof leadTouches.$inferSelect;
export type NewLeadTouch = typeof leadTouches.$inferInsert;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a lead has reached max touches (should pivot)
 */
export function shouldPivotLead(touchCount: number, maxTouches = 5): boolean {
  return touchCount >= maxTouches;
}

/**
 * Calculate block progress percentage
 */
export function calculateBlockProgress(
  totalTouches: number,
  targetSends = 10000,
): number {
  return Math.min(100, Math.round((totalTouches / targetSends) * 100));
}

/**
 * Check if block is complete
 */
export function isBlockComplete(
  totalTouches: number,
  targetSends = 10000,
): boolean {
  return totalTouches >= targetSends;
}
