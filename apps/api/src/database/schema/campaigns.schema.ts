import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { aiSdrAvatars } from "./ai-sdr-avatars.schema";
import { leads } from "./leads.schema";

export const campaigns = pgTable("campaigns", {
  id: primaryUlid("camp"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  sdrId: ulidColumn().references(() => aiSdrAvatars.id, {
    onDelete: "set null",
  }),
  name: varchar().notNull(),
  description: text(),
  targetMethod: varchar().notNull().default("SCORE_BASED"),
  minScore: integer().notNull(),
  maxScore: integer().notNull(),
  location: jsonb(),
  status: varchar().notNull().default("DRAFT"),
  estimatedLeadsCount: integer().notNull().default(0),
  startsAt: timestamp().notNull(),
  endsAt: timestamp(),
  pausedAt: timestamp(),
  resumedAt: timestamp(),
  // Approval gate - campaign cannot transition to RUNNING without approval
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  metadata: jsonb(),
  createdAt,
  updatedAt,
});

export const campaignSequences = pgTable(
  "campaign_sequences",
  {
    id: primaryUlid("cseq"),
    campaignId: ulidColumn()
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar().notNull(),
    name: varchar().notNull(),
    position: integer().notNull(),
    content: text().notNull(),
    subject: varchar(),
    voiceType: varchar(), //for voice
    delayDays: integer().notNull().default(0),
    delayHours: integer().notNull().default(0),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.campaignId)],
);

export const campaignLeads = pgTable(
  "campaign_leads",
  {
    campaignId: ulidColumn()
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    leadId: ulidColumn()
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    currentSequencePosition: integer().notNull().default(1),
    currentSequenceStatus: varchar().notNull().default("PENDING"),
    lastSequenceExecutedAt: timestamp(),
    nextSequenceRunAt: timestamp(),
    status: varchar().notNull().default("ACTIVE"),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex().on(t.campaignId, t.leadId)],
);

export const campaignExecutions = pgTable(
  "campaign_executions",
  {
    id: primaryUlid("cexec"),
    campaignId: ulidColumn()
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    leadId: ulidColumn()
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    sequenceId: ulidColumn()
      .references(() => campaignSequences.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar().notNull().default("PENDING"),
    failedReason: text(),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("campaign_exec_campaign_idx").on(t.campaignId),
    index("campaign_exec_lead_idx").on(t.leadId),
    index("campaign_exec_sequence_idx").on(t.sequenceId),
    // Hot path: active executions lookup
    index("campaign_exec_active_hot_idx").on(t.campaignId, t.status),
  ],
);

export const campaignEvents = pgTable(
  "campaign_events",
  {
    id: primaryUlid("cevt"),
    campaignId: ulidColumn()
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    sequenceId: ulidColumn().references(() => campaignSequences.id, {
      onDelete: "set null",
    }),
    leadId: ulidColumn()
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar().notNull(),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.campaignId),
    index().on(t.sequenceId),
    index().on(t.leadId),
  ],
);
