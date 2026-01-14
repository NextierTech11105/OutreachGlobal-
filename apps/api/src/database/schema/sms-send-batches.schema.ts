/**
 * SMS Send Batches Schema
 * Tracks the FULL outbound SMS lifecycle from data prep to delivery.
 *
 * Makes the core flow:
 * - VISIBLE: See every batch at every stage
 * - MANAGEABLE: Approve, pause, resume, cancel batches
 * - PREDICTABLE: Know expected delivery times and costs
 * - REPEATABLE: Template successful batches for future campaigns
 *
 * Flow: DATA PREP → CAMPAIGN PREP → APPROVAL → EXECUTION → DELIVERY → RESPONSE
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// =============================================================================
// SMS SEND BATCHES
// =============================================================================

export const SMS_SEND_BATCH_PK = "ssb";

/**
 * Batch status through the execution pipeline
 */
export type SmsBatchStatus =
  | "draft" // Being prepared, not finalized
  | "ready" // Data validated, awaiting approval
  | "approved" // Human approved, ready to execute
  | "queued" // In execution queue
  | "sending" // Actively sending
  | "paused" // Manually paused mid-execution
  | "completed" // All messages sent
  | "cancelled" // Cancelled before completion
  | "failed"; // System failure during execution

/**
 * SMS Send Batches Table
 *
 * Tracks every outbound SMS campaign batch through:
 * 1. DATA PREP: Raw leads → Enriched → Validated → DNC Clean
 * 2. CAMPAIGN PREP: Template selection → Personalization → Preview
 * 3. APPROVAL: Human review and sign-off
 * 4. EXECUTION: Queue → Send via SignalHouse
 * 5. DELIVERY: Track delivered/failed/blocked
 * 6. RESPONSE: Track replies and conversions
 */
export const smsSendBatches = pgTable(
  "sms_send_batches",
  {
    id: primaryUlid(SMS_SEND_BATCH_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Batch Identity ===
    name: varchar({ length: 255 }).notNull(), // "Q1 Solar Leads - Jan 13"
    description: text(),
    campaignId: ulidColumn("campaign_id"), // FK to campaigns table

    // === Status ===
    status: varchar({ length: 20 })
      .notNull()
      .default("draft")
      .$type<SmsBatchStatus>(),

    // === Data Prep Counts (Stage 1-2) ===
    // Shows progression: raw → enriched → validated → dnc_clean → ready
    rawCount: integer("raw_count").notNull().default(0), // Initial lead count
    enrichedCount: integer("enriched_count").default(0), // After skip trace
    validatedCount: integer("validated_count").default(0), // Phone validated
    dncCleanCount: integer("dnc_clean_count").default(0), // After DNC scrub
    readyCount: integer("ready_count").default(0), // Final sendable count

    // === Campaign Prep (Stage 3) ===
    templateId: ulidColumn("template_id"), // FK to message_templates
    templateName: varchar("template_name", { length: 255 }),
    sampleMessage: text("sample_message"), // Preview of personalized message
    workerId: varchar("worker_id", { length: 50 }), // 'gianna' | 'cathy' | 'sabrina'

    // === Approval (Stage 4) ===
    approvedBy: ulidColumn("approved_by"), // FK to users (null = not approved)
    approvedAt: timestamp("approved_at"),
    approvalNotes: text("approval_notes"),

    // === Execution Progress (Stage 5-6) ===
    queuedCount: integer("queued_count").default(0), // Added to send queue
    sentCount: integer("sent_count").default(0), // API call succeeded
    apiFailedCount: integer("api_failed_count").default(0), // API call failed

    // === Delivery Status (Stage 7) - Updated by webhooks ===
    deliveredCount: integer("delivered_count").default(0), // message.delivered
    failedCount: integer("failed_count").default(0), // message.failed
    blockedCount: integer("blocked_count").default(0), // message.blocked
    undeliveredCount: integer("undelivered_count").default(0), // message.undelivered

    // === Response Metrics (Stage 8-10) - Updated by webhooks ===
    repliedCount: integer("replied_count").default(0), // Any inbound response
    positiveCount: integer("positive_count").default(0), // Copilot: positive intent
    negativeCount: integer("negative_count").default(0), // Copilot: negative/not interested
    optedOutCount: integer("opted_out_count").default(0), // STOP keyword
    callQueueCount: integer("call_queue_count").default(0), // Pushed to hot call queue

    // === Conversion Outcomes ===
    meetingsBooked: integer("meetings_booked").default(0), // 15-min discoveries
    dealsWon: integer("deals_won").default(0), // Final conversions
    revenueGenerated: real("revenue_generated").default(0), // Total $ closed

    // === Cost Tracking ===
    estimatedCost: real("estimated_cost"), // readyCount × $0.XX per segment
    actualCost: real("actual_cost"), // Sum of actual API costs
    segmentCount: integer("segment_count").default(0), // Total SMS segments (for billing)

    // === Phone Pool Distribution ===
    // Which numbers were used (for rotation tracking)
    phonePoolStats: jsonb("phone_pool_stats").$type<{
      [phoneNumber: string]: {
        sent: number;
        delivered: number;
        failed: number;
      };
    }>(),

    // === Error Summary ===
    errorBreakdown: jsonb("error_breakdown").$type<{
      [errorCode: string]: number; // e.g., { "30003": 15, "30007": 3 }
    }>(),

    // === Timing ===
    scheduledAt: timestamp("scheduled_at"), // When to start sending (null = immediate)
    startedAt: timestamp("started_at"), // Execution started
    completedAt: timestamp("completed_at"), // All sends finished
    estimatedCompletionAt: timestamp("estimated_completion_at"), // ETA based on throughput

    // === Rate Limiting ===
    sendRatePerMinute: integer("send_rate_per_minute").default(60), // Throttle rate
    sendIntervalMs: integer("send_interval_ms").default(1000), // Ms between sends

    // === Timestamps ===
    createdAt,
    updatedAt,
  },
  (t) => [
    // Team dashboard queries
    index("ssb_team_status_idx").on(t.teamId, t.status),
    // Campaign grouping
    index("ssb_campaign_idx").on(t.campaignId),
    // Find batches needing approval
    index("ssb_pending_approval_idx").on(t.teamId, t.status, t.approvedAt),
    // Time-based queries
    index("ssb_team_created_idx").on(t.teamId, t.createdAt),
    // Scheduled sends
    index("ssb_scheduled_idx").on(t.scheduledAt, t.status),
  ],
);

// =============================================================================
// BATCH LEAD MAPPING (Optional - for detailed tracking)
// =============================================================================

export const SMS_BATCH_LEAD_PK = "sbl";

/**
 * Maps individual leads to batches for detailed status tracking.
 * Optional - use when you need per-lead status within a batch.
 */
export const smsBatchLeads = pgTable(
  "sms_batch_leads",
  {
    id: primaryUlid(SMS_BATCH_LEAD_PK),
    batchId: ulidColumn("batch_id").notNull(), // FK to sms_send_batches
    leadId: ulidColumn("lead_id").notNull(), // FK to leads

    // Lead's status within this batch
    status: varchar({ length: 20 }).default("pending"), // pending, sent, delivered, failed, replied

    // Tracking IDs
    shMessageId: varchar("sh_message_id", { length: 100 }), // SignalHouse message ID
    poolPhoneUsed: varchar("pool_phone_used", { length: 20 }), // Which pool number sent this

    // Timing
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    repliedAt: timestamp("replied_at"),

    // Error info
    errorCode: varchar("error_code", { length: 20 }),
    errorMessage: text("error_message"),

    createdAt,
  },
  (t) => [
    index("sbl_batch_idx").on(t.batchId),
    index("sbl_lead_idx").on(t.leadId),
    index("sbl_batch_status_idx").on(t.batchId, t.status),
    index("sbl_sh_message_idx").on(t.shMessageId),
  ],
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SmsSendBatch = typeof smsSendBatches.$inferSelect;
export type NewSmsSendBatch = typeof smsSendBatches.$inferInsert;

export type SmsBatchLead = typeof smsBatchLeads.$inferSelect;
export type NewSmsBatchLead = typeof smsBatchLeads.$inferInsert;

// =============================================================================
// COMPUTED METRICS HELPERS
// =============================================================================

/**
 * Calculate key metrics from batch counts
 */
export function calculateBatchMetrics(batch: SmsSendBatch) {
  const deliveryRate =
    batch.sentCount && batch.sentCount > 0
      ? ((batch.deliveredCount || 0) / batch.sentCount) * 100
      : 0;

  const responseRate =
    batch.deliveredCount && batch.deliveredCount > 0
      ? ((batch.repliedCount || 0) / batch.deliveredCount) * 100
      : 0;

  const conversionRate =
    batch.repliedCount && batch.repliedCount > 0
      ? ((batch.meetingsBooked || 0) / batch.repliedCount) * 100
      : 0;

  const costPerMeeting =
    batch.meetingsBooked && batch.meetingsBooked > 0 && batch.actualCost
      ? batch.actualCost / batch.meetingsBooked
      : null;

  const roi =
    batch.actualCost && batch.actualCost > 0 && batch.revenueGenerated
      ? ((batch.revenueGenerated - batch.actualCost) / batch.actualCost) * 100
      : null;

  return {
    deliveryRate: Math.round(deliveryRate * 10) / 10, // e.g., 94.5%
    responseRate: Math.round(responseRate * 10) / 10, // e.g., 12.3%
    conversionRate: Math.round(conversionRate * 10) / 10, // e.g., 8.5%
    costPerMeeting,
    roi,
    // Funnel drop-off
    enrichmentLoss: (batch.rawCount || 0) - (batch.enrichedCount || 0),
    validationLoss: (batch.enrichedCount || 0) - (batch.validatedCount || 0),
    dncLoss: (batch.validatedCount || 0) - (batch.dncCleanCount || 0),
    deliveryLoss: (batch.sentCount || 0) - (batch.deliveredCount || 0),
  };
}
