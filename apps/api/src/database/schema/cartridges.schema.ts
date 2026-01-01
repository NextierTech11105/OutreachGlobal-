/**
 * NEXTIER CARTRIDGE EXECUTION SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "A cartridge is a stage-scoped, versioned execution loop capped at five attempts
 *  that selects approved templates, pauses on silence, halts on reply, and may never
 *  override STOP, human intervention, or stage truth."
 *
 * Philosophy:
 * - Stopping is a feature, not a failure
 * - Silence is information, not absence
 * - Learning happens between runs, never mid-flight
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

// ============================================
// CARTRIDGE DEFINITIONS (Client-Built)
// ============================================

/**
 * Cartridge definitions - the "blueprint" for a cartridge type
 * Each client builds their own cartridges for each stage.
 * These are NOT pre-populated - clients start with nothing.
 */
export const cartridgeDefinitions = pgTable(
  "cartridge_definitions",
  {
    id: primaryUlid("cdef"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Identity
    name: varchar().notNull(), // e.g., "CART_INITIAL_VALUATION_V1"
    stage: varchar().notNull(), // e.g., "initial", "retarget", "nudge"
    version: integer().notNull().default(1),
    description: text(),

    // Template sequence (5 templates for 5 attempts)
    templateSequence: jsonb().$type<string[]>().notNull().default([]),

    // Timing
    delayBetweenAttemptsHours: integer().notNull().default(24),

    // Approval gate
    isActive: boolean().notNull().default(false),
    approvedBy: text(),
    approvedAt: timestamp(),

    // Metadata
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("cartridge_def_team_idx").on(t.teamId),
    index("cartridge_def_stage_idx").on(t.teamId, t.stage),
    index("cartridge_def_name_idx").on(t.teamId, t.name),
  ]
);

// ============================================
// CARTRIDGE INSTANCES (Per-Lead Execution)
// ============================================

/**
 * Cartridge instances - active execution for a specific lead
 * Each lead can have ONE active cartridge at a time.
 */
export const cartridgeInstances = pgTable(
  "cartridge_instances",
  {
    id: primaryUlid("cart"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Links
    leadId: ulidColumn()
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    definitionId: ulidColumn()
      .references(() => cartridgeDefinitions.id, { onDelete: "set null" }),

    // Execution state
    stage: varchar().notNull(), // Current outreach stage
    status: varchar().notNull().default("pending"),
    // Status: pending | active | paused | completed | holstered | interrupted

    // Attempt tracking (hard cap at 5)
    currentAttempt: integer().notNull().default(0),
    maxAttempts: integer().notNull().default(5), // Always 5

    // Tone tracking
    currentTone: varchar(), // authority | curiosity | direct | humor | final

    // Template sequence snapshot (frozen at creation time)
    templateSequence: jsonb().$type<string[]>().notNull().default([]),
    delayBetweenAttemptsHours: integer().notNull().default(24),

    // Timing
    lastAttemptAt: timestamp(),
    nextAttemptAt: timestamp(),
    completedAt: timestamp(),

    // Interruption handling
    interruptedBy: varchar(), // "reply" | "optout" | "human"
    interruptedAt: timestamp(),
    interruptReason: text(),

    // Audit
    assignedBy: varchar().notNull().default("system"),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("cartridge_inst_team_idx").on(t.teamId),
    index("cartridge_inst_lead_idx").on(t.leadId),
    // Hot path: find active cartridge for lead
    index("cartridge_inst_lead_status_idx").on(t.leadId, t.status),
    // Hot path: find cartridges ready for next attempt
    index("cartridge_inst_next_attempt_idx").on(t.status, t.nextAttemptAt),
  ]
);

// ============================================
// CARTRIDGE ATTEMPTS (Audit Trail)
// ============================================

/**
 * Cartridge attempt log - immutable audit trail
 * Every attempt is logged for learning and compliance.
 */
export const cartridgeAttempts = pgTable(
  "cartridge_attempts",
  {
    id: primaryUlid("catt"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Links
    cartridgeId: ulidColumn()
      .references(() => cartridgeInstances.id, { onDelete: "cascade" })
      .notNull(),
    leadId: ulidColumn()
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Attempt details
    attemptNumber: integer().notNull(), // 1-5
    tone: varchar().notNull(), // authority | curiosity | direct | humor | final
    templateId: varchar(),
    messageContent: text(),

    // Outcome
    status: varchar().notNull().default("pending"),
    // Status: pending | sent | delivered | failed | replied | stopped

    // Delivery tracking (from SignalHouse/Twilio)
    sentAt: timestamp(),
    deliveredAt: timestamp(),
    failedAt: timestamp(),
    failedReason: text(),

    // Response tracking
    repliedAt: timestamp(),
    replyContent: text(),
    replyIntent: varchar(), // interested | question | optout | unclear

    // Audit
    triggeredBy: varchar().notNull().default("system"), // system | human | scheduled
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("cartridge_att_team_idx").on(t.teamId),
    index("cartridge_att_cartridge_idx").on(t.cartridgeId),
    index("cartridge_att_lead_idx").on(t.leadId),
    // Hot path: find attempts for learning
    index("cartridge_att_status_idx").on(t.status, t.repliedAt),
  ]
);

// ============================================
// TYPE EXPORTS
// ============================================

export type CartridgeDefinition = typeof cartridgeDefinitions.$inferSelect;
export type NewCartridgeDefinition = typeof cartridgeDefinitions.$inferInsert;

export type CartridgeInstance = typeof cartridgeInstances.$inferSelect;
export type NewCartridgeInstance = typeof cartridgeInstances.$inferInsert;

export type CartridgeAttempt = typeof cartridgeAttempts.$inferSelect;
export type NewCartridgeAttempt = typeof cartridgeAttempts.$inferInsert;
