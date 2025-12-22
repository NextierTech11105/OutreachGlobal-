/**
 * SignalHouse Integration Schema
 * 10DLC Brand & Campaign Registration Tracking + Phone Number Management
 *
 * Multi-tenant infrastructure for SMS campaign compliance and phone number provisioning
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { campaigns } from "./campaigns.schema";

// ─────────────────────────────────────────────────────────────────────────────
// 10DLC BRAND REGISTRATION
// Tracks brand registration status with SignalHouse/TCR for 10DLC compliance
// ─────────────────────────────────────────────────────────────────────────────
export const signalhouseBrands = pgTable(
  "signalhouse_brands",
  {
    id: primaryUlid("shbrand"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // SignalHouse identifiers
    brandId: varchar().notNull(), // SignalHouse brand ID
    cspId: varchar(), // CSP ID if applicable

    // Brand details
    displayName: varchar().notNull(),
    companyName: varchar().notNull(),
    ein: varchar(), // Employer Identification Number
    einIssuingCountry: varchar().default("US"),
    entityType: varchar().notNull().default("PRIVATE_PROFIT"), // PRIVATE_PROFIT, PUBLIC_PROFIT, NON_PROFIT, GOVERNMENT, SOLE_PROPRIETOR
    vertical: varchar().notNull().default("PROFESSIONAL"), // Industry vertical

    // Contact info
    email: varchar(),
    phone: varchar(),
    street: varchar(),
    city: varchar(),
    state: varchar(),
    postalCode: varchar(),
    country: varchar().default("US"),
    website: varchar(),

    // Registration status
    registrationStatus: varchar().notNull().default("PENDING"), // PENDING, SUBMITTED, APPROVED, REJECTED, SUSPENDED
    tcrBrandId: varchar(), // The Campaign Registry brand ID
    tcrScore: integer(), // Trust score from TCR (0-100)
    vettingStatus: varchar().default("PENDING"), // PENDING, PASSED, FAILED

    // Metadata
    rejectionReason: text(),
    metadata: jsonb(),

    // Timestamps
    submittedAt: timestamp(),
    approvedAt: timestamp(),
    expiresAt: timestamp(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.teamId), // One brand per team
    index().on(t.brandId),
    index().on(t.registrationStatus),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// 10DLC CAMPAIGN REGISTRATION
// Tracks campaign (use case) registration with SignalHouse/TCR
// ─────────────────────────────────────────────────────────────────────────────
export const signalhouseCampaigns = pgTable(
  "signalhouse_campaigns",
  {
    id: primaryUlid("shcamp"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    brandId: ulidColumn()
      .references(() => signalhouseBrands.id, { onDelete: "cascade" })
      .notNull(),

    // SignalHouse identifiers
    campaignId: varchar().notNull(), // SignalHouse campaign ID
    tcrCampaignId: varchar(), // TCR campaign ID

    // Campaign details
    useCase: varchar().notNull().default("MIXED"), // LOW_VOLUME, MIXED, MARKETING, ACCOUNT_NOTIFICATION, etc.
    subUseCases: jsonb().$type<string[]>().default([]),
    description: text().notNull(),
    sampleMessages: jsonb().$type<string[]>().default([]),

    // Message flow settings
    subscriberOptIn: boolean().notNull().default(true),
    subscriberOptOut: boolean().notNull().default(true),
    subscriberHelp: boolean().notNull().default(true),
    embeddedLink: boolean().notNull().default(false),
    embeddedPhone: boolean().notNull().default(false),
    numberPool: boolean().notNull().default(false),
    ageGated: boolean().notNull().default(false),
    directLending: boolean().notNull().default(false),
    affiliateMarketing: boolean().notNull().default(false),

    // Throughput limits
    messageClassification: varchar().default("STANDARD"), // LOW, STANDARD, HIGH
    dailyLimit: integer(),
    monthlyLimit: integer(),
    tps: real(), // Transactions per second limit

    // Registration status
    registrationStatus: varchar().notNull().default("PENDING"), // PENDING, SUBMITTED, APPROVED, REJECTED, SUSPENDED, EXPIRED
    rejectionReason: text(),

    // Link to internal campaign (optional)
    internalCampaignId: ulidColumn().references(() => campaigns.id, {
      onDelete: "set null",
    }),

    // Metadata
    metadata: jsonb(),

    // Timestamps
    submittedAt: timestamp(),
    approvedAt: timestamp(),
    expiresAt: timestamp(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.brandId),
    index().on(t.campaignId),
    index().on(t.registrationStatus),
    index().on(t.useCase),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PHONE NUMBERS
// Phone numbers provisioned from SignalHouse for each team
// ─────────────────────────────────────────────────────────────────────────────
export const teamPhoneNumbers = pgTable(
  "team_phone_numbers",
  {
    id: primaryUlid("tphone"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Phone number details
    phoneNumber: varchar().notNull(), // E.164 format: +15551234567
    formattedNumber: varchar(), // Display format: (555) 123-4567
    areaCode: varchar(3),

    // SignalHouse identifiers
    signalhouseId: varchar(), // SignalHouse phone number ID
    orderId: varchar(), // SignalHouse order ID

    // Number type and capabilities
    numberType: varchar().notNull().default("local"), // local, toll-free, short-code
    capabilities: jsonb()
      .$type<{
        sms: boolean;
        mms: boolean;
        voice: boolean;
        fax: boolean;
      }>()
      .default({ sms: true, mms: false, voice: false, fax: false }),

    // 10DLC association
    brandId: ulidColumn().references(() => signalhouseBrands.id, {
      onDelete: "set null",
    }),
    campaignId: ulidColumn().references(() => signalhouseCampaigns.id, {
      onDelete: "set null",
    }),

    // Configuration
    forwardingNumber: varchar(), // Voice forwarding
    webhookUrl: varchar(), // Custom webhook for this number
    smsUrl: varchar(), // SMS webhook override
    voiceUrl: varchar(), // Voice webhook override

    // Status
    status: varchar().notNull().default("active"), // active, pending, suspended, released
    provisionedAt: timestamp(),
    releasedAt: timestamp(),

    // Usage tracking
    monthlyMessageCount: integer().default(0),
    lastMessageAt: timestamp(),

    // Metadata
    friendlyName: varchar(), // User-defined label
    tags: jsonb().$type<string[]>().default([]),
    metadata: jsonb(),

    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.phoneNumber), // Globally unique phone numbers
    index().on(t.teamId),
    index().on(t.status),
    index().on(t.brandId),
    index().on(t.campaignId),
    index().on(t.numberType),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// SIGNALHOUSE SUBGROUPS (MULTI-TENANCY)
// SubGroups for tenant isolation within SignalHouse
// ─────────────────────────────────────────────────────────────────────────────
export const signalhouseSubgroups = pgTable(
  "signalhouse_subgroups",
  {
    id: primaryUlid("shsub"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // SignalHouse identifiers
    subgroupId: varchar().notNull(), // SignalHouse subgroup ID
    subgroupName: varchar().notNull(),

    // Configuration
    isDefault: boolean().notNull().default(false),
    settings: jsonb(),

    // Billing isolation
    walletId: varchar(), // Separate wallet for this subgroup

    // Status
    status: varchar().notNull().default("active"), // active, suspended, deleted

    // Metadata
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.teamId, t.subgroupId),
    index().on(t.teamId),
    index().on(t.status),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// SIGNALHOUSE WEBHOOK EVENTS LOG
// Audit trail for all webhook events received from SignalHouse
// ─────────────────────────────────────────────────────────────────────────────
export const signalhouseWebhookEvents = pgTable(
  "signalhouse_webhook_events",
  {
    id: primaryUlid("shwh"),
    teamId: teamsRef({ onDelete: "set null" }),

    // Event details
    eventType: varchar().notNull(), // SMS_RECEIVED, BRAND_ADD, CAMPAIGN_EXPIRED, etc.
    eventId: varchar(), // SignalHouse event ID if provided
    webhookId: varchar(), // Our webhook ID

    // Related entities
    phoneNumber: varchar(),
    messageId: varchar(),
    brandId: varchar(),
    campaignId: varchar(),

    // Payload
    rawPayload: jsonb().notNull(),
    processedPayload: jsonb(),

    // Processing status
    status: varchar().notNull().default("received"), // received, processed, failed, ignored
    errorMessage: text(),
    processingTimeMs: integer(),

    // Timestamps
    receivedAt: timestamp().notNull().defaultNow(),
    processedAt: timestamp(),
    createdAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.eventType),
    index().on(t.receivedAt),
    index().on(t.status),
    index().on(t.phoneNumber),
    index().on(t.messageId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// SIGNALHOUSE USAGE ANALYTICS
// Daily aggregated usage metrics per team
// ─────────────────────────────────────────────────────────────────────────────
export const signalhouseUsage = pgTable(
  "signalhouse_usage",
  {
    id: primaryUlid("shuse"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Date for aggregation
    date: timestamp().notNull(),

    // Message counts
    smsSent: integer().notNull().default(0),
    smsReceived: integer().notNull().default(0),
    smsDelivered: integer().notNull().default(0),
    smsFailed: integer().notNull().default(0),
    mmsSent: integer().notNull().default(0),
    mmsReceived: integer().notNull().default(0),

    // Costs
    messagingCost: real().default(0),
    phoneNumberCost: real().default(0),
    totalCost: real().default(0),

    // Response metrics
    avgResponseTimeMs: integer(),
    optOutCount: integer().default(0),
    conversationCount: integer().default(0),

    // Metadata
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.teamId, t.date),
    index().on(t.teamId),
    index().on(t.date),
  ],
);

// Export types for TypeScript
export type SignalhouseBrand = typeof signalhouseBrands.$inferSelect;
export type NewSignalhouseBrand = typeof signalhouseBrands.$inferInsert;
export type SignalhouseCampaign = typeof signalhouseCampaigns.$inferSelect;
export type NewSignalhouseCampaign = typeof signalhouseCampaigns.$inferInsert;
export type TeamPhoneNumber = typeof teamPhoneNumbers.$inferSelect;
export type NewTeamPhoneNumber = typeof teamPhoneNumbers.$inferInsert;
export type SignalhouseSubgroup = typeof signalhouseSubgroups.$inferSelect;
export type NewSignalhouseSubgroup = typeof signalhouseSubgroups.$inferInsert;
export type SignalhouseWebhookEvent =
  typeof signalhouseWebhookEvents.$inferSelect;
export type NewSignalhouseWebhookEvent =
  typeof signalhouseWebhookEvents.$inferInsert;
export type SignalhouseUsage = typeof signalhouseUsage.$inferSelect;
export type NewSignalhouseUsage = typeof signalhouseUsage.$inferInsert;
