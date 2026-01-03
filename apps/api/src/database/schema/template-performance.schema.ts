/**
 * TEMPLATE PERFORMANCE SCHEMA
 * ===========================
 * Tracks template effectiveness for A/B optimization.
 * Updated daily from SignalHouse analytics webhooks.
 *
 * Key metrics:
 * - Reply rate (responses / delivered)
 * - Positive rate (positive responses / all responses)
 * - Opt-out rate (opt-outs / delivered) - lower is better
 * - Composite score (weighted combination)
 *
 * Used by ML advisory layer to suggest best templates.
 */

import {
  decimal,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";

// Primary key prefix
export const TEMPLATE_PERF_PK = "tpl";

/**
 * Template Performance Table
 *
 * Aggregated daily metrics for each template.
 * Enables data-driven template selection.
 */
export const templatePerformance = pgTable(
  "template_performance",
  {
    id: primaryUlid(TEMPLATE_PERF_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Template identification
    templateId: varchar("template_id").notNull(),
    templateName: varchar("template_name").notNull(),
    campaignId: varchar("campaign_id"),
    campaignLane: varchar("campaign_lane"), // cold_opener, follow_up, closer

    // Period (daily aggregation)
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY METRICS
    // ═══════════════════════════════════════════════════════════════
    totalSent: integer("total_sent").notNull().default(0),
    totalDelivered: integer("total_delivered").notNull().default(0),
    totalFailed: integer("total_failed").notNull().default(0),

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE METRICS
    // ═══════════════════════════════════════════════════════════════
    totalReplied: integer("total_replied").notNull().default(0),
    positiveReplies: integer("positive_replies").notNull().default(0),
    negativeReplies: integer("negative_replies").notNull().default(0),
    questionReplies: integer("question_replies").notNull().default(0),
    neutralReplies: integer("neutral_replies").notNull().default(0),

    // ═══════════════════════════════════════════════════════════════
    // CONVERSION METRICS
    // ═══════════════════════════════════════════════════════════════
    emailsCaptured: integer("emails_captured").notNull().default(0),
    callsScheduled: integer("calls_scheduled").notNull().default(0),
    meetingsBooked: integer("meetings_booked").notNull().default(0),

    // ═══════════════════════════════════════════════════════════════
    // SUPPRESSION METRICS (lower is better)
    // ═══════════════════════════════════════════════════════════════
    optOuts: integer("opt_outs").notNull().default(0),
    wrongNumbers: integer("wrong_numbers").notNull().default(0),
    complaints: integer("complaints").notNull().default(0),

    // ═══════════════════════════════════════════════════════════════
    // COMPUTED RATES (0.0000 - 1.0000)
    // ═══════════════════════════════════════════════════════════════
    deliveryRate: decimal("delivery_rate", { precision: 5, scale: 4 }),
    replyRate: decimal("reply_rate", { precision: 5, scale: 4 }),
    positiveRate: decimal("positive_rate", { precision: 5, scale: 4 }),
    conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }),
    optOutRate: decimal("opt_out_rate", { precision: 5, scale: 4 }),

    // ═══════════════════════════════════════════════════════════════
    // COMPOSITE SCORE (0-100)
    // Weighted: 40% conversions, 25% positive, 20% reply, 15% delivery
    // Penalty: -10 points per 1% opt-out rate
    // ═══════════════════════════════════════════════════════════════
    compositeScore: decimal("composite_score", { precision: 5, scale: 2 }),

    // ═══════════════════════════════════════════════════════════════
    // TOUCH PERFORMANCE (by touch number 1-5)
    // ═══════════════════════════════════════════════════════════════
    touch1Sent: integer("touch1_sent").default(0),
    touch1Replied: integer("touch1_replied").default(0),
    touch2Sent: integer("touch2_sent").default(0),
    touch2Replied: integer("touch2_replied").default(0),
    touch3Sent: integer("touch3_sent").default(0),
    touch3Replied: integer("touch3_replied").default(0),
    touch4Sent: integer("touch4_sent").default(0),
    touch4Replied: integer("touch4_replied").default(0),
    touch5Sent: integer("touch5_sent").default(0),
    touch5Replied: integer("touch5_replied").default(0),

    createdAt,
    updatedAt,
  },
  (t) => [
    // Unique: one record per template per period
    uniqueIndex("template_perf_template_period_idx").on(
      t.teamId,
      t.templateId,
      t.periodStart,
    ),

    // Team scoping
    index("template_perf_team_idx").on(t.teamId),

    // Best templates query (by composite score)
    index("template_perf_score_idx").on(t.teamId, t.compositeScore),

    // Campaign filtering
    index("template_perf_campaign_idx").on(t.campaignId),

    // Lane filtering (cold_opener, follow_up, closer)
    index("template_perf_lane_idx").on(t.campaignLane),
  ],
);

// Relations
export const templatePerformanceRelations = relations(
  templatePerformance,
  ({ one }) => ({
    team: one(teams, {
      fields: [templatePerformance.teamId],
      references: [teams.id],
    }),
  }),
);

// Type exports
export type TemplatePerformance = typeof templatePerformance.$inferSelect;
export type NewTemplatePerformance = typeof templatePerformance.$inferInsert;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate composite score from metrics
 * Weights: 40% conversions, 25% positive, 20% reply, 15% delivery
 * Penalty: -10 points per 1% opt-out rate
 */
export function calculateCompositeScore(metrics: {
  deliveryRate: number;
  replyRate: number;
  positiveRate: number;
  conversionRate: number;
  optOutRate: number;
}): number {
  const weights = {
    conversion: 40,
    positive: 25,
    reply: 20,
    delivery: 15,
  };

  const baseScore =
    metrics.conversionRate * weights.conversion * 100 +
    metrics.positiveRate * weights.positive * 100 +
    metrics.replyRate * weights.reply * 100 +
    metrics.deliveryRate * weights.delivery * 100;

  // Penalty for opt-outs (10 points per 1% opt-out rate)
  const optOutPenalty = metrics.optOutRate * 1000;

  return Math.max(0, Math.min(100, baseScore - optOutPenalty));
}

/**
 * Calculate rates from raw counts
 */
export function calculateRates(metrics: {
  totalSent: number;
  totalDelivered: number;
  totalReplied: number;
  positiveReplies: number;
  emailsCaptured: number;
  meetingsBooked: number;
  optOuts: number;
}): {
  deliveryRate: number;
  replyRate: number;
  positiveRate: number;
  conversionRate: number;
  optOutRate: number;
} {
  const deliveryRate =
    metrics.totalSent > 0 ? metrics.totalDelivered / metrics.totalSent : 0;

  const replyRate =
    metrics.totalDelivered > 0
      ? metrics.totalReplied / metrics.totalDelivered
      : 0;

  const positiveRate =
    metrics.totalReplied > 0
      ? metrics.positiveReplies / metrics.totalReplied
      : 0;

  const conversions = metrics.emailsCaptured + metrics.meetingsBooked;
  const conversionRate =
    metrics.totalDelivered > 0 ? conversions / metrics.totalDelivered : 0;

  const optOutRate =
    metrics.totalDelivered > 0 ? metrics.optOuts / metrics.totalDelivered : 0;

  return {
    deliveryRate,
    replyRate,
    positiveRate,
    conversionRate,
    optOutRate,
  };
}

/**
 * Get performance tier based on composite score
 */
export function getPerformanceTier(
  score: number,
): "excellent" | "good" | "average" | "poor" {
  if (score >= 70) return "excellent";
  if (score >= 50) return "good";
  if (score >= 30) return "average";
  return "poor";
}
