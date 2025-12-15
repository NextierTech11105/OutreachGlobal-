import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { aiSdrAvatars } from "./ai-sdr-avatars.schema";
import { campaigns } from "./campaigns.schema";
import { InitialMessageCategory, MessageTone } from "@nextier/common";

// Primary key prefixes
export const INITIAL_MESSAGE_PK = "imsg";
export const CAMPAIGN_INITIAL_MESSAGE_PK = "cim";
export const SDR_CAMPAIGN_CONFIG_PK = "sdrcc";

// Initial Message Library
export const initialMessages = pgTable(
  "initial_messages",
  {
    id: primaryUlid(INITIAL_MESSAGE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Message content
    name: varchar().notNull(),
    description: text(),
    content: text().notNull(),

    // Categorization
    category: varchar().notNull().$type<InitialMessageCategory>(),
    tone: varchar()
      .notNull()
      .$type<MessageTone>()
      .default(MessageTone.PROFESSIONAL),
    tags: text().array().default([]),

    // SDR Assignment
    defaultSdrId: ulidColumn().references(() => aiSdrAvatars.id, {
      onDelete: "set null",
    }),

    // Performance metrics
    timesUsed: integer().notNull().default(0),
    responseRate: integer().default(0),
    positiveResponseRate: integer().default(0),
    avgResponseTime: integer(),

    // Personalization tokens
    availableTokens: text()
      .array()
      .default([
        "{{firstName}}",
        "{{lastName}}",
        "{{propertyAddress}}",
        "{{city}}",
        "{{equity}}",
      ]),

    // A/B testing
    isVariant: boolean().default(false),
    parentMessageId: ulidColumn(),
    variantName: varchar(),

    // Status
    isActive: boolean().default(true),
    isArchived: boolean().default(false),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.category),
    index().on(t.defaultSdrId),
    index().on(t.isActive),
  ],
);

// Campaign Initial Message assignments
export const campaignInitialMessages = pgTable(
  "campaign_initial_messages",
  {
    id: primaryUlid(CAMPAIGN_INITIAL_MESSAGE_PK),
    campaignId: ulidColumn()
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    initialMessageId: ulidColumn()
      .references(() => initialMessages.id, { onDelete: "cascade" })
      .notNull(),
    assignedSdrId: ulidColumn().references(() => aiSdrAvatars.id, {
      onDelete: "set null",
    }),
    position: integer().notNull().default(0),
    weight: integer().notNull().default(100),
    isActive: boolean().default(true),

    // Performance for this specific campaign
    sentCount: integer().notNull().default(0),
    responseCount: integer().notNull().default(0),
    positiveResponseCount: integer().notNull().default(0),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.campaignId),
    index().on(t.initialMessageId),
    index().on(t.assignedSdrId),
  ],
);

// Sabrina AI SDR specific configurations
export const sdrCampaignConfigs = pgTable(
  "sdr_campaign_configs",
  {
    id: primaryUlid(SDR_CAMPAIGN_CONFIG_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    sdrId: ulidColumn()
      .references(() => aiSdrAvatars.id, { onDelete: "cascade" })
      .notNull(),
    campaignId: ulidColumn()
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),

    // Response handling
    autoRespondToPositive: boolean().default(true),
    autoRespondToNeutral: boolean().default(false),
    escalateNegative: boolean().default(true),

    // Timing
    minResponseDelaySeconds: integer().default(30),
    maxResponseDelaySeconds: integer().default(300),
    activeHoursStart: varchar().default("09:00"),
    activeHoursEnd: varchar().default("18:00"),
    activeDays: text().array().default(["MON", "TUE", "WED", "THU", "FRI"]),
    timezone: varchar().default("America/New_York"),

    // Personalization
    useLeadFirstName: boolean().default(true),
    signatureStyle: varchar().default("FRIENDLY"),

    // Limits
    maxDailyResponses: integer().default(100),
    maxResponsesPerLead: integer().default(10),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.sdrId), index().on(t.campaignId), index().on(t.teamId)],
);
