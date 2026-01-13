/**
 * SignalHouse Integration Schema
 *
 * Normalized tables for SignalHouse 10DLC campaigns.
 * NOTE: Phone number assignments are handled by worker_phone_assignments table,
 * not a separate signalhouse_numbers table.
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

/**
 * Campaign types for 10DLC registration
 */
export type CampaignType = "MARKETING" | "NURTURE" | "ALERTS" | "BOOKING";

/**
 * Campaign status workflow
 */
export type CampaignStatus = "pending" | "submitted" | "approved" | "rejected";

/**
 * SignalHouse Campaigns Table
 *
 * Normalizes the signalhouseCampaignIds JSON array from teams table.
 * Each row represents a 10DLC campaign registered with SignalHouse.
 *
 * Flow:
 * 1. Team onboards → signalhouse_campaigns rows created (status: pending)
 * 2. Submit to SignalHouse API → status: submitted
 * 3. SignalHouse approves → status: approved, shCampaignId populated
 * 4. Campaign can now be used for SMS sending
 */
export const signalhouseCampaigns = pgTable(
  "signalhouse_campaigns",
  {
    id: primaryUlid("shc"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Internal campaign info
    campaignType: varchar("campaign_type", { length: 50 }).notNull(), // MARKETING, NURTURE, ALERTS, BOOKING
    name: varchar({ length: 255 }).notNull(),
    description: text(),

    // SignalHouse IDs (populated after API calls)
    shCampaignId: varchar("sh_campaign_id", { length: 100 }), // From SignalHouse API
    shBrandId: varchar("sh_brand_id", { length: 100 }), // Parent brand
    shSubGroupId: varchar("sh_subgroup_id", { length: 100 }), // Parent sub-group

    // 10DLC required fields
    useCase: varchar("use_case", { length: 100 }), // 10DLC use case code
    sampleMessages: jsonb("sample_messages").$type<string[]>(),
    optInDescription: text("opt_in_description"),
    helpKeywords: varchar("help_keywords", { length: 255 }).default("HELP"),
    stopKeywords: varchar("stop_keywords", { length: 255 }).default("STOP"),

    // Status tracking
    status: varchar({ length: 50 }).default("pending"), // pending, submitted, approved, rejected
    submittedAt: timestamp("submitted_at"),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index("shc_team_idx").on(t.teamId),
    index("shc_sh_campaign_idx").on(t.shCampaignId),
    index("shc_type_idx").on(t.teamId, t.campaignType),
    index("shc_status_idx").on(t.teamId, t.status),
  ],
);

/**
 * Type exports for use in other modules
 */
export type SignalhouseCampaign = typeof signalhouseCampaigns.$inferSelect;
export type NewSignalhouseCampaign = typeof signalhouseCampaigns.$inferInsert;
