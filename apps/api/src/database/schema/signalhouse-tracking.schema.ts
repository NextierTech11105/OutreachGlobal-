/**
 * SignalHouse Tracking Schema
 * Complete message delivery tracking and webhook audit logging.
 *
 * Fills the gaps in our SignalHouse integration:
 * - Message-level delivery status (sent/delivered/failed)
 * - Error code tracking for health monitoring
 * - Webhook audit log for debugging and replay
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
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// =============================================================================
// SIGNALHOUSE MESSAGE STATUS
// =============================================================================

export const SIGNALHOUSE_MESSAGE_STATUS_PK = "sms";

/**
 * Delivery status values from SignalHouse
 */
export type SignalhouseDeliveryStatus =
  | "queued" // Message accepted, pending send
  | "sending" // Currently being sent to carrier
  | "sent" // Sent to carrier (not yet delivered)
  | "delivered" // Confirmed delivered to handset
  | "undelivered" // Carrier couldn't deliver
  | "failed" // Send failed (bad number, etc)
  | "blocked"; // Blocked by carrier/spam filter

/**
 * SignalHouse Message Status Table
 *
 * Tracks delivery lifecycle for every outbound message.
 * Updated via SignalHouse webhooks (message.sent, message.delivered, etc)
 *
 * Flow:
 * 1. We send SMS → Create row with status: queued
 * 2. Webhook: message.sent → Update status: sent
 * 3. Webhook: message.delivered → Update status: delivered
 * OR
 * 3. Webhook: message.failed → Update status: failed + error_code
 */
export const signalhouseMessageStatus = pgTable(
  "signalhouse_message_status",
  {
    id: primaryUlid(SIGNALHOUSE_MESSAGE_STATUS_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === SignalHouse IDs ===
    shMessageId: varchar("sh_message_id", { length: 100 }).notNull(), // msg_xxx from SignalHouse
    shSubgroupId: varchar("sh_subgroup_id", { length: 100 }), // For routing verification
    shCampaignId: varchar("sh_campaign_id", { length: 100 }), // Which 10DLC campaign

    // === Our Internal References ===
    messageId: ulidColumn("message_id"), // FK to messages table (nullable for flexibility)
    leadId: ulidColumn("lead_id"), // FK to leads table
    campaignId: ulidColumn("campaign_id"), // Our internal campaign

    // === Phone Numbers ===
    fromNumber: varchar("from_number", { length: 20 }).notNull(), // Our number (E.164)
    toNumber: varchar("to_number", { length: 20 }).notNull(), // Lead's number (E.164)

    // === Delivery Status ===
    status: varchar({ length: 20 })
      .notNull()
      .default("queued")
      .$type<SignalhouseDeliveryStatus>(),

    // === Timing ===
    queuedAt: timestamp("queued_at").defaultNow().notNull(),
    sentAt: timestamp("sent_at"), // When SignalHouse sent to carrier
    deliveredAt: timestamp("delivered_at"), // When confirmed on handset
    failedAt: timestamp("failed_at"), // When failure confirmed

    // === Error Tracking ===
    errorCode: varchar("error_code", { length: 20 }), // 30003, 30007, etc
    errorMessage: text("error_message"), // Human-readable error
    carrierCode: varchar("carrier_code", { length: 50 }), // Carrier-specific code
    carrierName: varchar("carrier_name", { length: 100 }), // AT&T, Verizon, etc

    // === Metadata ===
    segmentCount: integer("segment_count").default(1), // SMS segments (for billing)
    direction: varchar({ length: 10 }).default("outbound"), // outbound | inbound

    // === Timestamps ===
    createdAt,
    updatedAt,
  },
  (t) => [
    // Lookup by SignalHouse message ID (webhook routing)
    index("shms_sh_message_idx").on(t.shMessageId),
    // Team + status for dashboards
    index("shms_team_status_idx").on(t.teamId, t.status),
    // Find failures for a number (health monitoring)
    index("shms_from_status_idx").on(t.fromNumber, t.status),
    // Lead delivery history
    index("shms_lead_idx").on(t.leadId),
    // Time-based queries (recent failures, etc)
    index("shms_team_created_idx").on(t.teamId, t.createdAt),
    // Error analysis
    index("shms_error_idx").on(t.teamId, t.errorCode),
  ],
);

// =============================================================================
// SIGNALHOUSE WEBHOOK LOG
// =============================================================================

export const SIGNALHOUSE_WEBHOOK_LOG_PK = "shw";

/**
 * Webhook event types from SignalHouse
 */
export type SignalhouseWebhookEvent =
  | "message.queued"
  | "message.sent"
  | "message.delivered"
  | "message.undelivered"
  | "message.failed"
  | "message.received" // Inbound
  | "message.opted_out" // STOP keyword
  | "number.health_alert"
  | "campaign.status_change"
  | "unknown";

/**
 * SignalHouse Webhook Log Table
 *
 * Audit trail of every webhook received from SignalHouse.
 * Enables:
 * - Debugging delivery issues
 * - Replaying failed webhook processing
 * - Analytics on delivery patterns
 * - Compliance audit trail
 */
export const signalhouseWebhookLog = pgTable(
  "signalhouse_webhook_log",
  {
    id: primaryUlid(SIGNALHOUSE_WEBHOOK_LOG_PK),

    // === Event Identity ===
    shEventId: varchar("sh_event_id", { length: 100 }), // SignalHouse event ID (if provided)
    eventType: varchar("event_type", { length: 50 })
      .notNull()
      .$type<SignalhouseWebhookEvent>(),

    // === Routing Info ===
    teamId: ulidColumn("team_id"), // Resolved team (null if couldn't resolve)
    shSubgroupId: varchar("sh_subgroup_id", { length: 100 }), // From payload
    shMessageId: varchar("sh_message_id", { length: 100 }), // Related message

    // === Payload ===
    payload: jsonb("payload").notNull(), // Full webhook JSON
    headers: jsonb("headers"), // Request headers (for debugging)

    // === Processing Status ===
    processed: boolean("processed").notNull().default(false),
    processedAt: timestamp("processed_at"),
    processingError: text("processing_error"), // If processing failed
    retryCount: integer("retry_count").notNull().default(0),

    // === Request Info ===
    ipAddress: varchar("ip_address", { length: 45 }), // For security audit
    userAgent: varchar("user_agent", { length: 255 }),

    // === Timestamps ===
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    createdAt,
  },
  (t) => [
    // Lookup by SignalHouse event ID (deduplication)
    index("shwl_event_id_idx").on(t.shEventId),
    // Find unprocessed webhooks (retry queue)
    index("shwl_processed_idx").on(t.processed, t.receivedAt),
    // Team event history
    index("shwl_team_idx").on(t.teamId, t.receivedAt),
    // Event type analysis
    index("shwl_type_idx").on(t.eventType, t.receivedAt),
    // Message event chain
    index("shwl_message_idx").on(t.shMessageId),
    // Subgroup routing debug
    index("shwl_subgroup_idx").on(t.shSubgroupId),
  ],
);

// =============================================================================
// SIGNALHOUSE ERROR CODES REFERENCE
// =============================================================================

/**
 * Common SignalHouse/Carrier Error Codes
 * Store as reference - not a table, just documentation
 */
export const SIGNALHOUSE_ERROR_CODES = {
  // Carrier Errors
  "30001": "Queue overflow",
  "30002": "Account suspended",
  "30003": "Unreachable destination",
  "30004": "Message blocked",
  "30005": "Unknown destination",
  "30006": "Landline or unreachable",
  "30007": "Carrier violation",
  "30008": "Unknown error",

  // Content Errors
  "30009": "Missing segment",
  "30010": "Message too long",

  // Number Errors
  "30011": "Invalid 'to' number",
  "30012": "Invalid 'from' number",

  // Rate Limiting
  "30022": "Exceeded throughput limit",
  "30023": "Rate limit exceeded",

  // 10DLC Specific
  "30034": "Campaign not approved",
  "30035": "Brand not verified",
} as const;

export type SignalhouseErrorCode = keyof typeof SIGNALHOUSE_ERROR_CODES;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SignalhouseMessageStatus =
  typeof signalhouseMessageStatus.$inferSelect;
export type NewSignalhouseMessageStatus =
  typeof signalhouseMessageStatus.$inferInsert;

export type SignalhouseWebhookLog = typeof signalhouseWebhookLog.$inferSelect;
export type NewSignalhouseWebhookLog =
  typeof signalhouseWebhookLog.$inferInsert;
