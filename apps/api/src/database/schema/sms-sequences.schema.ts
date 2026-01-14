/**
 * SMS SEQUENCES SCHEMA
 *
 * Growth OS Module: Multi-Step Drip Campaigns
 *
 * Purpose:
 * - Define multi-step SMS sequences with timing rules
 * - Track lead progress through sequences
 * - Handle branching based on responses
 * - Integrate with cartridges and templates
 *
 * Flow:
 * Trigger → Sequence Start → Step 1 → Wait → Step 2 → ... → End/Branch
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
  real,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

// =============================================================================
// SMS SEQUENCES
// =============================================================================

export const SMS_SEQUENCE_PK = "seq";

export type SequenceStatus = "draft" | "active" | "paused" | "archived";
export type SequenceTrigger =
  | "manual"
  | "stage_change"
  | "tag_added"
  | "campaign_enrollment"
  | "api"
  | "form_submission"
  | "meeting_booked"
  | "meeting_no_show";

/**
 * SMS Sequence - a multi-step drip campaign
 */
export const smsSequences = pgTable(
  "sms_sequences",
  {
    id: primaryUlid(SMS_SEQUENCE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    name: varchar({ length: 255 }).notNull(),
    description: text(),
    status: varchar({ length: 20 }).default("draft").$type<SequenceStatus>(),

    // === Trigger Configuration ===
    trigger: varchar({ length: 50 }).default("manual").$type<SequenceTrigger>(),
    triggerConfig: jsonb("trigger_config").$type<{
      stages?: string[];
      tags?: string[];
      campaignIds?: string[];
      formIds?: string[];
    }>(),

    // === Audience Targeting ===
    audienceId: ulidColumn("audience_id"), // Optional - filter by audience
    icpId: ulidColumn("icp_id"), // Optional - filter by ICP
    personaId: ulidColumn("persona_id"), // Optional - filter by persona

    // === Timing Settings ===
    sendWindowStart: integer("send_window_start").default(9), // Hour (0-23)
    sendWindowEnd: integer("send_window_end").default(17),
    timezone: varchar({ length: 50 }).default("America/New_York"),
    excludeWeekends: boolean("exclude_weekends").default(true),
    excludeHolidays: boolean("exclude_holidays").default(true),

    // === Exit Conditions ===
    exitOnReply: boolean("exit_on_reply").default(true),
    exitOnMeetingBooked: boolean("exit_on_meeting_booked").default(true),
    exitOnUnsubscribe: boolean("exit_on_unsubscribe").default(true),
    exitOnStageChange: boolean("exit_on_stage_change").default(false),
    exitStages: jsonb("exit_stages").$type<string[]>(),

    // === Limits ===
    maxEnrollmentsPerDay: integer("max_enrollments_per_day").default(100),
    maxActiveEnrollments: integer("max_active_enrollments").default(1000),

    // === Stats ===
    totalEnrollments: integer("total_enrollments").default(0),
    activeEnrollments: integer("active_enrollments").default(0),
    completedEnrollments: integer("completed_enrollments").default(0),
    exitedEnrollments: integer("exited_enrollments").default(0),

    // === Performance ===
    replyRate: real("reply_rate").default(0),
    meetingRate: real("meeting_rate").default(0),
    unsubscribeRate: real("unsubscribe_rate").default(0),

    // === Metadata ===
    createdBy: ulidColumn("created_by"),
    isActive: boolean("is_active").default(true),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("seq_team_idx").on(t.teamId),
    index("seq_status_idx").on(t.teamId, t.status),
    index("seq_trigger_idx").on(t.trigger),
    index("seq_active_idx").on(t.teamId, t.isActive),
  ],
);

// =============================================================================
// SEQUENCE STEPS
// =============================================================================

export const SEQUENCE_STEP_PK = "sst";

export type StepType = "sms" | "wait" | "branch" | "exit" | "tag" | "webhook";
export type WaitUnit = "minutes" | "hours" | "days" | "business_days";

/**
 * Sequence Step - individual step in a sequence
 */
export const sequenceSteps = pgTable(
  "sequence_steps",
  {
    id: primaryUlid(SEQUENCE_STEP_PK),
    sequenceId: ulidColumn("sequence_id").notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Step Configuration ===
    stepNumber: integer("step_number").notNull(),
    type: varchar({ length: 20 }).notNull().$type<StepType>(),
    name: varchar({ length: 255 }),

    // === SMS Step Config ===
    templateId: ulidColumn("template_id"), // Message template
    cartridgeId: ulidColumn("cartridge_id"), // Or use cartridge
    messageContent: text("message_content"), // Or raw content
    usePersonalization: boolean("use_personalization").default(true),

    // === Wait Step Config ===
    waitDuration: integer("wait_duration"),
    waitUnit: varchar("wait_unit", { length: 20 }).$type<WaitUnit>(),

    // === Branch Step Config ===
    branchCondition: jsonb("branch_condition").$type<{
      type: "reply" | "no_reply" | "positive_reply" | "negative_reply" | "tag";
      value?: string;
      lookbackHours?: number;
    }>(),
    trueBranchStepId: ulidColumn("true_branch_step_id"),
    falseBranchStepId: ulidColumn("false_branch_step_id"),

    // === Tag Step Config ===
    addTags: jsonb("add_tags").$type<string[]>(),
    removeTags: jsonb("remove_tags").$type<string[]>(),

    // === Webhook Step Config ===
    webhookUrl: text("webhook_url"),
    webhookHeaders: jsonb("webhook_headers").$type<Record<string, string>>(),

    // === Stats ===
    executionCount: integer("execution_count").default(0),
    successCount: integer("success_count").default(0),
    failureCount: integer("failure_count").default(0),

    // === Metadata ===
    isActive: boolean("is_active").default(true),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("sst_sequence_idx").on(t.sequenceId),
    index("sst_team_idx").on(t.teamId),
    index("sst_step_number_idx").on(t.sequenceId, t.stepNumber),
    index("sst_type_idx").on(t.type),
  ],
);

// =============================================================================
// SEQUENCE ENROLLMENTS
// =============================================================================

export const SEQUENCE_ENROLLMENT_PK = "sen";

export type EnrollmentStatus =
  | "active"
  | "paused"
  | "completed"
  | "exited"
  | "failed";

export type ExitReason =
  | "completed"
  | "replied"
  | "meeting_booked"
  | "unsubscribed"
  | "stage_changed"
  | "manual"
  | "error"
  | "suppressed";

/**
 * Sequence Enrollment - tracks a lead's progress through a sequence
 */
export const sequenceEnrollments = pgTable(
  "sequence_enrollments",
  {
    id: primaryUlid(SEQUENCE_ENROLLMENT_PK),
    sequenceId: ulidColumn("sequence_id").notNull(),
    leadId: ulidColumn("lead_id").notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Status ===
    status: varchar({ length: 20 }).default("active").$type<EnrollmentStatus>(),
    currentStepId: ulidColumn("current_step_id"),
    currentStepNumber: integer("current_step_number").default(1),

    // === Timing ===
    enrolledAt: timestamp("enrolled_at").defaultNow(),
    enrolledBy: ulidColumn("enrolled_by"), // User or 'system'
    nextStepAt: timestamp("next_step_at"),
    pausedAt: timestamp("paused_at"),
    completedAt: timestamp("completed_at"),
    exitedAt: timestamp("exited_at"),

    // === Exit Details ===
    exitReason: varchar("exit_reason", { length: 50 }).$type<ExitReason>(),
    exitDetails: text("exit_details"),

    // === Progress Tracking ===
    stepsCompleted: integer("steps_completed").default(0),
    messagesSent: integer("messages_sent").default(0),
    repliesReceived: integer("replies_received").default(0),

    // === Metadata ===
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("sen_sequence_idx").on(t.sequenceId),
    index("sen_lead_idx").on(t.leadId),
    index("sen_team_idx").on(t.teamId),
    index("sen_status_idx").on(t.status),
    index("sen_next_step_idx").on(t.nextStepAt),
    index("sen_active_idx").on(t.sequenceId, t.status),
  ],
);

// =============================================================================
// SEQUENCE STEP EXECUTIONS
// =============================================================================

export const STEP_EXECUTION_PK = "sex";

export type ExecutionStatus = "pending" | "success" | "failed" | "skipped";

/**
 * Step Executions - log of each step execution
 */
export const sequenceStepExecutions = pgTable(
  "sequence_step_executions",
  {
    id: primaryUlid(STEP_EXECUTION_PK),
    enrollmentId: ulidColumn("enrollment_id").notNull(),
    stepId: ulidColumn("step_id").notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Execution Details ===
    status: varchar({ length: 20 }).default("pending").$type<ExecutionStatus>(),
    scheduledAt: timestamp("scheduled_at"),
    executedAt: timestamp("executed_at"),

    // === Results ===
    messageId: ulidColumn("message_id"), // If SMS was sent
    signalhouseMessageId: varchar("signalhouse_message_id", { length: 100 }),
    deliveryStatus: varchar("delivery_status", { length: 50 }),

    // === Branch Results ===
    branchResult: boolean("branch_result"), // For branch steps

    // === Error Handling ===
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),

    createdAt,
  },
  (t) => [
    index("sex_enrollment_idx").on(t.enrollmentId),
    index("sex_step_idx").on(t.stepId),
    index("sex_team_idx").on(t.teamId),
    index("sex_status_idx").on(t.status),
    index("sex_scheduled_idx").on(t.scheduledAt),
  ],
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SmsSequence = typeof smsSequences.$inferSelect;
export type NewSmsSequence = typeof smsSequences.$inferInsert;

export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type NewSequenceStep = typeof sequenceSteps.$inferInsert;

export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;
export type NewSequenceEnrollment = typeof sequenceEnrollments.$inferInsert;

export type SequenceStepExecution = typeof sequenceStepExecutions.$inferSelect;
export type NewSequenceStepExecution =
  typeof sequenceStepExecutions.$inferInsert;

// =============================================================================
// SEQUENCE TEMPLATES
// =============================================================================

/**
 * Pre-built sequence templates for common use cases
 */
export const SEQUENCE_TEMPLATES = {
  initial_outreach: {
    name: "Initial Outreach Sequence",
    description: "5-touch sequence for cold outreach",
    steps: [
      {
        type: "sms",
        name: "Initial Message",
        waitAfter: { duration: 2, unit: "days" },
      },
      {
        type: "sms",
        name: "Follow-up 1",
        waitAfter: { duration: 3, unit: "days" },
      },
      {
        type: "sms",
        name: "Value Add",
        waitAfter: { duration: 4, unit: "days" },
      },
      {
        type: "sms",
        name: "Social Proof",
        waitAfter: { duration: 5, unit: "days" },
      },
      { type: "sms", name: "Final Touch", waitAfter: null },
    ],
  },
  meeting_reminder: {
    name: "Meeting Reminder Sequence",
    description: "Automated reminders for scheduled meetings",
    steps: [
      {
        type: "sms",
        name: "24hr Reminder",
        triggerBefore: { duration: 24, unit: "hours" },
      },
      {
        type: "sms",
        name: "1hr Reminder",
        triggerBefore: { duration: 1, unit: "hours" },
      },
    ],
  },
  no_show_follow_up: {
    name: "No-Show Follow-up",
    description: "Re-engage leads who missed their meeting",
    steps: [
      {
        type: "sms",
        name: "Missed You",
        waitAfter: { duration: 30, unit: "minutes" },
      },
      {
        type: "sms",
        name: "Reschedule Offer",
        waitAfter: { duration: 1, unit: "days" },
      },
      { type: "sms", name: "Final Attempt", waitAfter: null },
    ],
  },
  nurture: {
    name: "Long-term Nurture",
    description: "Stay in touch with leads not ready to buy",
    steps: [
      {
        type: "sms",
        name: "Check-in 1",
        waitAfter: { duration: 7, unit: "days" },
      },
      {
        type: "sms",
        name: "Value Content",
        waitAfter: { duration: 14, unit: "days" },
      },
      {
        type: "sms",
        name: "Check-in 2",
        waitAfter: { duration: 14, unit: "days" },
      },
      { type: "sms", name: "Offer", waitAfter: null },
    ],
  },
} as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calculate next step execution time considering send windows
 */
export function calculateNextStepTime(
  fromTime: Date,
  waitDuration: number,
  waitUnit: WaitUnit,
  sendWindowStart: number,
  sendWindowEnd: number,
  excludeWeekends: boolean,
  timezone: string,
): Date {
  const targetTime = new Date(fromTime);

  // Add wait duration
  switch (waitUnit) {
    case "minutes":
      targetTime.setMinutes(targetTime.getMinutes() + waitDuration);
      break;
    case "hours":
      targetTime.setHours(targetTime.getHours() + waitDuration);
      break;
    case "days":
      targetTime.setDate(targetTime.getDate() + waitDuration);
      break;
    case "business_days": {
      let daysAdded = 0;
      while (daysAdded < waitDuration) {
        targetTime.setDate(targetTime.getDate() + 1);
        const day = targetTime.getDay();
        if (day !== 0 && day !== 6) {
          daysAdded++;
        }
      }
      break;
    }
  }

  // Adjust to send window
  const hour = targetTime.getHours();
  if (hour < sendWindowStart) {
    targetTime.setHours(sendWindowStart, 0, 0, 0);
  } else if (hour >= sendWindowEnd) {
    targetTime.setDate(targetTime.getDate() + 1);
    targetTime.setHours(sendWindowStart, 0, 0, 0);
  }

  // Skip weekends if needed
  if (excludeWeekends) {
    const day = targetTime.getDay();
    if (day === 0) {
      targetTime.setDate(targetTime.getDate() + 1);
    } else if (day === 6) {
      targetTime.setDate(targetTime.getDate() + 2);
    }
  }

  return targetTime;
}

/**
 * Check if a lead can be enrolled in a sequence
 */
export function canEnroll(
  sequence: SmsSequence,
  existingEnrollments: SequenceEnrollment[],
): { canEnroll: boolean; reason?: string } {
  // Check if already enrolled and active
  const activeEnrollment = existingEnrollments.find(
    (e) => e.sequenceId === sequence.id && e.status === "active",
  );
  if (activeEnrollment) {
    return { canEnroll: false, reason: "Already enrolled in this sequence" };
  }

  // Check max active enrollments
  if (
    sequence.maxActiveEnrollments &&
    (sequence.activeEnrollments ?? 0) >= sequence.maxActiveEnrollments
  ) {
    return { canEnroll: false, reason: "Sequence at maximum capacity" };
  }

  return { canEnroll: true };
}
