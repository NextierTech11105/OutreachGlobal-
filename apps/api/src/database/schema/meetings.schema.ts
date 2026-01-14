/**
 * MEETINGS ENGINE SCHEMA
 *
 * Growth OS Module: Tracks meetings from booking through outcome.
 *
 * Meeting Flow:
 * SMS → AI Classification → Hot Call Queue → VOICE → 15-MIN DISCOVERY → QUALIFICATION → CLOSE
 *
 * Meeting Types:
 * - 15-min Discovery: Initial qualification call
 * - 45-60 min Strategy: Deep dive with qualified prospects
 *
 * State Machine:
 * scheduled → confirmed → in_progress → completed → outcome_logged
 *            → no_show → rescheduled
 *            → cancelled
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
// MEETING TYPES
// =============================================================================

export type MeetingType =
  | "discovery_15" // 15-min Discovery call
  | "strategy_45" // 45-min Strategy session
  | "strategy_60" // 60-min Strategy session
  | "demo" // Product demo
  | "follow_up" // Follow-up call
  | "closing"; // Closing call

export type MeetingStatus =
  | "scheduled" // Meeting booked, awaiting confirmation
  | "confirmed" // Attendee confirmed
  | "reminded" // Reminder sent
  | "in_progress" // Meeting happening now
  | "completed" // Meeting finished
  | "no_show" // Attendee didn't show
  | "rescheduled" // Moved to new time
  | "cancelled"; // Cancelled by either party

export type MeetingOutcome =
  | "qualified" // Prospect qualifies, move to next stage
  | "not_qualified" // Doesn't fit ICP
  | "nurture" // Not ready now, nurture sequence
  | "follow_up" // Needs another meeting
  | "proposal_sent" // Proposal/quote sent
  | "closed_won" // Deal closed
  | "closed_lost" // Deal lost
  | "no_decision"; // No outcome determined

export type QualificationStage =
  | "unqualified" // Not yet qualified
  | "mql" // Marketing Qualified Lead
  | "sql" // Sales Qualified Lead
  | "opportunity" // Active opportunity
  | "proposal" // Proposal stage
  | "negotiation" // Negotiating terms
  | "closed"; // Deal closed (won or lost)

// =============================================================================
// MEETINGS TABLE
// =============================================================================

export const MEETING_PK = "mtg";

export const meetings = pgTable(
  "meetings",
  {
    id: primaryUlid(MEETING_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Lead/Contact Info ===
    leadId: ulidColumn("lead_id"), // FK to leads table
    contactName: varchar("contact_name", { length: 255 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    companyName: varchar("company_name", { length: 255 }),

    // === Meeting Details ===
    type: varchar({ length: 20 }).notNull().$type<MeetingType>(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    durationMinutes: integer("duration_minutes").notNull().default(15),

    // === Scheduling ===
    scheduledAt: timestamp("scheduled_at").notNull(),
    scheduledEndAt: timestamp("scheduled_end_at"),
    timezone: varchar({ length: 50 }).default("America/New_York"),
    calendarEventId: varchar("calendar_event_id", { length: 255 }), // External calendar ID
    meetingLink: varchar("meeting_link", { length: 500 }), // Zoom/Meet link

    // === Status ===
    status: varchar({ length: 20 })
      .notNull()
      .default("scheduled")
      .$type<MeetingStatus>(),
    confirmedAt: timestamp("confirmed_at"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),

    // === Outcome & Qualification ===
    outcome: varchar({ length: 20 }).$type<MeetingOutcome>(),
    outcomeNotes: text("outcome_notes"),
    qualificationStage: varchar("qualification_stage", { length: 20 })
      .default("unqualified")
      .$type<QualificationStage>(),

    // === Assignment ===
    hostUserId: ulidColumn("host_user_id"), // User who hosts the meeting
    hostName: varchar("host_name", { length: 255 }),

    // === Source Tracking ===
    sourceChannel: varchar("source_channel", { length: 50 }), // 'sms', 'email', 'call', 'web'
    sourceCampaignId: ulidColumn("source_campaign_id"),
    sourceLeadId: ulidColumn("source_lead_id"), // Original lead that became this meeting

    // === Reminders ===
    reminder24hSent: boolean("reminder_24h_sent").default(false),
    reminder1hSent: boolean("reminder_1h_sent").default(false),
    reminder15mSent: boolean("reminder_15m_sent").default(false),

    // === No-Show Handling ===
    noShowFollowUpSent: boolean("no_show_follow_up_sent").default(false),
    rescheduleCount: integer("reschedule_count").default(0),
    originalMeetingId: ulidColumn("original_meeting_id"), // If rescheduled, link to original

    // === Recording & Notes ===
    recordingUrl: varchar("recording_url", { length: 500 }),
    transcriptUrl: varchar("transcript_url", { length: 500 }),
    meetingNotes: text("meeting_notes"),

    // === Revenue Attribution ===
    dealValue: real("deal_value"), // If closed, the deal amount
    dealCurrency: varchar("deal_currency", { length: 3 }).default("USD"),

    // === Metadata ===
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("mtg_team_idx").on(t.teamId),
    index("mtg_lead_idx").on(t.leadId),
    index("mtg_status_idx").on(t.teamId, t.status),
    index("mtg_scheduled_idx").on(t.scheduledAt),
    index("mtg_host_idx").on(t.hostUserId),
    index("mtg_outcome_idx").on(t.teamId, t.outcome),
    index("mtg_qualification_idx").on(t.teamId, t.qualificationStage),
  ],
);

// =============================================================================
// MEETING ATTENDEES (for multi-attendee meetings)
// =============================================================================

export const MEETING_ATTENDEE_PK = "mta";

export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    id: primaryUlid(MEETING_ATTENDEE_PK),
    meetingId: ulidColumn("meeting_id").notNull(),

    // Attendee info
    name: varchar({ length: 255 }),
    email: varchar({ length: 255 }),
    phone: varchar({ length: 20 }),
    role: varchar({ length: 50 }), // 'host', 'attendee', 'optional'

    // Response
    responseStatus: varchar("response_status", { length: 20 }).default(
      "pending",
    ), // pending, accepted, declined, tentative
    respondedAt: timestamp("responded_at"),

    // Attendance
    attended: boolean().default(false),
    joinedAt: timestamp("joined_at"),
    leftAt: timestamp("left_at"),

    createdAt,
  },
  (t) => [
    index("mta_meeting_idx").on(t.meetingId),
    index("mta_email_idx").on(t.email),
  ],
);

// =============================================================================
// MEETING OUTCOMES LOG (Detailed outcome tracking)
// =============================================================================

export const MEETING_OUTCOME_PK = "mto";

export const meetingOutcomes = pgTable(
  "meeting_outcomes",
  {
    id: primaryUlid(MEETING_OUTCOME_PK),
    meetingId: ulidColumn("meeting_id").notNull(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // === Outcome Details ===
    outcome: varchar({ length: 20 }).notNull().$type<MeetingOutcome>(),
    previousStage: varchar("previous_stage", {
      length: 20,
    }).$type<QualificationStage>(),
    newStage: varchar("new_stage", { length: 20 }).$type<QualificationStage>(),

    // === Notes & Feedback ===
    notes: text(),
    nextSteps: text("next_steps"),
    objections: jsonb("objections").$type<string[]>(), // Objections raised
    interests: jsonb("interests").$type<string[]>(), // What they're interested in

    // === Deal Info ===
    estimatedDealValue: real("estimated_deal_value"),
    estimatedCloseDate: timestamp("estimated_close_date"),
    probability: integer(), // 0-100 win probability

    // === Follow-up ===
    followUpRequired: boolean("follow_up_required").default(false),
    followUpDate: timestamp("follow_up_date"),
    followUpType: varchar("follow_up_type", {
      length: 20,
    }).$type<MeetingType>(),

    // === User who logged ===
    loggedBy: ulidColumn("logged_by"),
    loggedAt: timestamp("logged_at").defaultNow(),

    createdAt,
  },
  (t) => [
    index("mto_meeting_idx").on(t.meetingId),
    index("mto_team_idx").on(t.teamId),
    index("mto_outcome_idx").on(t.outcome),
  ],
);

// =============================================================================
// QUALIFICATION RULES (ICP definition per team)
// =============================================================================

export const QUALIFICATION_RULE_PK = "qrl";

export const qualificationRules = pgTable(
  "qualification_rules",
  {
    id: primaryUlid(QUALIFICATION_RULE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    name: varchar({ length: 255 }).notNull(),
    description: text(),
    isActive: boolean("is_active").default(true),

    // === Criteria ===
    // JSON structure for flexible qualification criteria
    criteria: jsonb("criteria").$type<{
      // Company criteria
      minRevenue?: number;
      maxRevenue?: number;
      minEmployees?: number;
      maxEmployees?: number;
      industries?: string[];
      excludeIndustries?: string[];

      // Contact criteria
      titles?: string[];
      excludeTitles?: string[];

      // Geographic
      countries?: string[];
      states?: string[];
      excludeStates?: string[];

      // Custom fields
      customFields?: Record<string, unknown>;
    }>(),

    // === Scoring ===
    // Points awarded when criteria match
    scoringRules: jsonb("scoring_rules").$type<{
      [criterion: string]: number; // e.g., { "revenue_over_1m": 10, "decision_maker": 20 }
    }>(),

    // Threshold to qualify
    qualificationThreshold: integer("qualification_threshold").default(50),

    // === Stage mapping ===
    targetStage: varchar("target_stage", { length: 20 })
      .default("sql")
      .$type<QualificationStage>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("qrl_team_idx").on(t.teamId),
    index("qrl_active_idx").on(t.teamId, t.isActive),
  ],
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

export type MeetingAttendee = typeof meetingAttendees.$inferSelect;
export type NewMeetingAttendee = typeof meetingAttendees.$inferInsert;

export type MeetingOutcomeLog = typeof meetingOutcomes.$inferSelect;
export type NewMeetingOutcomeLog = typeof meetingOutcomes.$inferInsert;

export type QualificationRule = typeof qualificationRules.$inferSelect;
export type NewQualificationRule = typeof qualificationRules.$inferInsert;

// =============================================================================
// MEETING STATE MACHINE HELPERS
// =============================================================================

/**
 * Valid state transitions for meetings
 */
export const MEETING_STATE_TRANSITIONS: Record<MeetingStatus, MeetingStatus[]> =
  {
    scheduled: ["confirmed", "cancelled", "rescheduled"],
    confirmed: [
      "reminded",
      "in_progress",
      "no_show",
      "cancelled",
      "rescheduled",
    ],
    reminded: ["in_progress", "no_show", "cancelled", "rescheduled"],
    in_progress: ["completed"],
    completed: [], // Terminal state
    no_show: ["rescheduled"], // Can only reschedule after no-show
    rescheduled: ["scheduled"], // Creates new meeting
    cancelled: [], // Terminal state
  };

/**
 * Check if a state transition is valid
 */
export function canTransitionTo(
  currentStatus: MeetingStatus,
  newStatus: MeetingStatus,
): boolean {
  return MEETING_STATE_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get next valid states
 */
export function getNextValidStates(
  currentStatus: MeetingStatus,
): MeetingStatus[] {
  return MEETING_STATE_TRANSITIONS[currentStatus] ?? [];
}

// =============================================================================
// QUALIFICATION STAGE FLOW
// =============================================================================

export const QUALIFICATION_STAGE_ORDER: QualificationStage[] = [
  "unqualified",
  "mql",
  "sql",
  "opportunity",
  "proposal",
  "negotiation",
  "closed",
];

/**
 * Check if stage B is ahead of stage A
 */
export function isStageAhead(
  stageA: QualificationStage,
  stageB: QualificationStage,
): boolean {
  const indexA = QUALIFICATION_STAGE_ORDER.indexOf(stageA);
  const indexB = QUALIFICATION_STAGE_ORDER.indexOf(stageB);
  return indexB > indexA;
}

// =============================================================================
// MEETING TYPE DEFAULTS
// =============================================================================

export const MEETING_TYPE_DEFAULTS: Record<
  MeetingType,
  { duration: number; title: string }
> = {
  discovery_15: { duration: 15, title: "15-Minute Discovery Call" },
  strategy_45: { duration: 45, title: "Strategy Session" },
  strategy_60: { duration: 60, title: "Strategy Session" },
  demo: { duration: 30, title: "Product Demo" },
  follow_up: { duration: 15, title: "Follow-Up Call" },
  closing: { duration: 30, title: "Closing Call" },
};
