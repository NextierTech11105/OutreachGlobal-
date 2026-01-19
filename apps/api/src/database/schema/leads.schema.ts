import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { integrations } from "./integrations.schema";
import { properties } from "./properties.schema";

// ═══════════════════════════════════════════════════════════════════════════
// LUCI ENGINE: Enrichment Status
// ═══════════════════════════════════════════════════════════════════════════
export const enrichmentStatusEnum = pgEnum("enrichment_status", [
  "raw", // Imported, cleaned
  "traced", // Tracerfy phones/emails merged
  "scored", // Trestle grades applied
  "ready", // lead_id assigned, in Lead Lab
  "rejected", // Failed qualification
  "campaign", // Pushed to campaign
]);

// Canonical lead state enum - mirrors canonical-lead-state.schema.ts
export const leadStateEnumPg = pgEnum("lead_state_canonical", [
  "new", // Just imported, no contact yet
  "touched", // SMS_SENT at least once
  "retargeting", // No response after 7D - being retargeted
  "responded", // Got any reply
  "soft_interest", // Showed mild interest (questions, curiosity)
  "email_captured", // Email extracted from conversation
  "content_nurture", // In nurture sequence (SMS, MMS, email, links)
  "high_intent", // Expressed buying/selling intent
  "appointment_booked", // Meeting scheduled
  "in_call_queue", // Escalated for human call
  "closed", // Deal won/lost
  "suppressed", // STOP/DNC - terminal state
]);

export const leads = pgTable(
  "leads",
  {
    id: primaryUlid("lead"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    integrationId: ulidColumn().references(() => integrations.id, {
      onDelete: "set null",
    }),
    propertyId: ulidColumn().references(() => properties.id, {
      onDelete: "set null",
    }),
    position: integer().notNull().default(0),
    externalId: varchar(),
    firstName: varchar(),
    lastName: varchar(),
    email: varchar(),
    phone: varchar(),
    title: varchar(),
    company: varchar(),
    status: varchar(),
    // Pipeline status: raw → ready → queued → sent → replied → booked
    pipelineStatus: varchar().notNull().default("raw"),
    score: integer().notNull().default(0),
    tags: text().array(),
    // Canonical lead state (NEW→TOUCHED→RESPONDED→etc.)
    leadState: leadStateEnumPg("lead_state").default("new"),
    zipCode: varchar(),
    country: varchar(),
    state: varchar(),
    city: varchar(),
    address: varchar(),
    source: varchar(),
    notes: text(),
    metadata: jsonb(),
    customFields: jsonb(),
    createdAt,
    updatedAt,

    // ═══════════════════════════════════════════════════════════════════════
    // LUCI ENGINE: Data Enrichment Fields
    // ═══════════════════════════════════════════════════════════════════════

    // Lead ID: NXT-{sic_code}-{uuid6}
    leadId: varchar({ length: 20 }),
    enrichmentStatus: enrichmentStatusEnum("enrichment_status").default("raw"),
    readyAt: timestamp({ withTimezone: true }),

    // TRACERFY: Skip Trace Results
    primaryPhone: varchar({ length: 15 }),
    primaryPhoneType: varchar({ length: 10 }), // Mobile/Landline/VoIP
    mobile1: varchar({ length: 15 }),
    mobile2: varchar({ length: 15 }),
    mobile3: varchar({ length: 15 }),
    mobile4: varchar({ length: 15 }),
    mobile5: varchar({ length: 15 }),
    landline1: varchar({ length: 15 }),
    landline2: varchar({ length: 15 }),
    landline3: varchar({ length: 15 }),
    email1: varchar({ length: 100 }),
    email2: varchar({ length: 100 }),
    email3: varchar({ length: 100 }),
    email4: varchar({ length: 100 }),
    email5: varchar({ length: 100 }),

    // Tracerfy Queue ID (for webhook matching)
    tracerfyQueueId: integer(),

    // TRESTLE: Phone Scoring
    phoneActivityScore: smallint(), // 0-100
    phoneContactGrade: varchar({ length: 1 }), // A-F
    phoneLineType: varchar({ length: 20 }),
    phoneNameMatch: boolean(),

    // TRESTLE: Email Scoring
    emailContactGrade: varchar({ length: 1 }), // A-F
    emailNameMatch: boolean(),

    // LUCI Tags
    sourceTag: varchar({ length: 20 }).default("usbizdata"),
    sectorTag: varchar({ length: 50 }),
    sicTag: varchar({ length: 10 }),
    sicDescription: text(),

    // USBizData Fields
    county: varchar({ length: 50 }),
    website: varchar({ length: 100 }),
    employees: varchar({ length: 20 }),
    annualSales: varchar({ length: 30 }),
    sicCode: varchar({ length: 10 }),

    // Campaign Assignment
    campaignId: ulidColumn(),
    smsReady: boolean().default(false),
  },
  (t) => [
    index().on(t.teamId),
    uniqueIndex().on(t.teamId, t.integrationId, t.externalId),
    index().on(t.score),
    // Phone lookup indexes for DNC/opt-out checks
    index("leads_phone_idx").on(t.phone),
    index("leads_team_phone_idx").on(t.teamId, t.phone),
    index("leads_team_status_idx").on(t.teamId, t.status),
    // Pipeline status index for dashboard aggregations
    index("leads_team_pipeline_idx").on(t.teamId, t.pipelineStatus),
    // Recent leads per team (for dashboard, list views)
    index("leads_team_created_idx").on(t.teamId, t.createdAt),
    // Email lookup index
    index("leads_email_idx").on(t.email),
    // Canonical lead state index
    index("leads_team_lead_state_idx").on(t.teamId, t.leadState),
    // LUCI Engine indexes
    index("leads_enrichment_status_idx").on(t.enrichmentStatus),
    index("leads_sector_tag_idx").on(t.sectorTag),
    index("leads_lead_id_idx").on(t.leadId),
    index("leads_phone_grade_idx").on(t.phoneContactGrade),
    index("leads_activity_score_idx").on(t.phoneActivityScore),
  ],
);

export const leadPhoneNumbers = pgTable(
  "lead_phone_numbers",
  {
    id: primaryUlid("lpn"),
    leadId: ulidColumn()
      .references(() => leads.id, {
        onDelete: "cascade",
      })
      .notNull(),
    phone: varchar().notNull(),
    label: varchar().notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.leadId),
    index("lead_phone_numbers_phone_idx").on(t.phone),
    index("lead_phone_numbers_lead_phone_idx").on(t.leadId, t.phone),
  ],
);

export const importLeadPresets = pgTable("import_lead_presets", {
  id: primaryUlid("ilp"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  name: varchar().notNull(),
  config: jsonb().$type<Record<string, any>>(),
  createdAt,
  updatedAt,
});
