/**
 * SMS Phone Pool Schema
 * Enables automatic phone number rotation for SignalHouse SMS sending.
 *
 * ADDITIVE ONLY - Does not replace or modify existing tables.
 * Coexists with worker_phone_assignments for backwards compatibility.
 */
import {
  index,
  pgTable,
  varchar,
  boolean,
  integer,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

export const SMS_PHONE_POOL_PK = "spp";

/**
 * SMS Phone Pool Table
 *
 * Tracks multiple phone numbers per team with rotation state for:
 * - Round-robin distribution of outbound SMS
 * - Health tracking (delivery rates, failures)
 * - Daily rate limit compliance
 * - Auto-disable for failing numbers
 */
export const smsPhonePool = pgTable(
  "sms_phone_pool",
  {
    id: primaryUlid(SMS_PHONE_POOL_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Phone identity
    phoneNumber: varchar("phone_number").notNull(), // E.164: +1XXXXXXXXXX
    signalhouseNumberId: varchar("signalhouse_number_id"), // SignalHouse internal ID

    // Worker assignment (optional - null = shared pool for all workers)
    workerId: varchar("worker_id"), // 'gianna' | 'cathy' | 'sabrina' | null

    // Rotation state
    rotationIndex: integer("rotation_index").notNull().default(0), // Position in round-robin
    lastUsedAt: timestamp("last_used_at"), // For LRU selection

    // Send metrics (for smart rotation)
    sendCount: integer("send_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    deliveryRate: real("delivery_rate"), // successCount / sendCount (0.0 - 1.0)

    // Rate limiting
    dailySendCount: integer("daily_send_count").notNull().default(0),
    dailyLimitResetAt: timestamp("daily_limit_reset_at"),

    // Health status
    isActive: boolean("is_active").notNull().default(true),
    isHealthy: boolean("is_healthy").notNull().default(true),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastHealthCheckAt: timestamp("last_health_check_at"),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index("spp_team_idx").on(t.teamId),
    index("spp_phone_idx").on(t.phoneNumber),
    index("spp_worker_idx").on(t.teamId, t.workerId),
    // Rotation query optimization: ORDER BY lastUsedAt ASC
    index("spp_rotation_idx").on(t.teamId, t.workerId, t.lastUsedAt),
  ],
);

// Type exports
export type SmsPhonePool = typeof smsPhonePool.$inferSelect;
export type NewSmsPhonePool = typeof smsPhonePool.$inferInsert;

// Rotation strategies
export type RotationStrategy = "round-robin" | "least-used" | "best-health";
