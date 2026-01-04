/**
 * CAMPAIGN BLOCKS SCHEMA
 * ======================
 * Divides campaigns into 2000-lead blocks for compliance and tracking.
 * Each block goes through: preparing → active → paused → completed
 *
 * SignalHouse requires 2000-lead blocks for rate limiting and compliance.
 */

import {
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { campaigns } from "./campaigns.schema";
import { leads } from "./leads.schema";

// Primary key prefix
export const CAMPAIGN_BLOCK_PK = "blk";
export const LEAD_TOUCH_PK = "tch";

// Block status enum
export type BlockStatus = "preparing" | "active" | "paused" | "completed";

/**
 * Campaign Blocks Table
 *
 * Each block contains up to 2000 leads and tracks touch progress.
 */
export const campaignBlocks = pgTable(
  "campaign_blocks",
  {
    id: primaryUlid(CAMPAIGN_BLOCK_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    campaignId: ulidColumn("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),

    // Block identification
    blockNumber: integer("block_number").notNull().default(1),
    status: varchar().$type<BlockStatus>().notNull().default("preparing"),

    // Lead capacity
    leadsLoaded: integer("leads_loaded").notNull().default(0),
    maxLeads: integer("max_leads").notNull().default(2000),

    // Touch tracking
    currentTouch: integer("current_touch").notNull().default(0),
    maxTouches: integer("max_touches").notNull().default(6),
    touchesSent: integer("touches_sent").notNull().default(0),
    targetTouches: integer("target_touches").notNull().default(12000), // 2000 * 6

    // Timestamps
    startedAt: timestamp("started_at"),
    pausedAt: timestamp("paused_at"),
    completedAt: timestamp("completed_at"),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("campaign_blocks_campaign_idx").on(t.campaignId),
    index("campaign_blocks_team_idx").on(t.teamId),
    index("campaign_blocks_status_idx").on(t.status),
    index("campaign_blocks_campaign_block_idx").on(t.campaignId, t.blockNumber),
  ],
);

/**
 * Lead Touches Table
 *
 * Tracks each SMS touch sent to a lead within a block.
 */
export const leadTouches = pgTable(
  "lead_touches",
  {
    id: primaryUlid(LEAD_TOUCH_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    blockId: ulidColumn("block_id")
      .references(() => campaignBlocks.id, { onDelete: "cascade" })
      .notNull(),
    leadId: ulidColumn("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),

    // Touch details
    touchNumber: integer("touch_number").notNull(),
    templateId: varchar("template_id"),
    status: varchar().notNull().default("pending"), // pending, sent, delivered, failed
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    failedAt: timestamp("failed_at"),
    failedReason: varchar("failed_reason"),

    // Response tracking
    repliedAt: timestamp("replied_at"),
    replyContent: varchar("reply_content"),
    replySentiment: varchar("reply_sentiment"), // positive, negative, neutral, question

    createdAt,
    updatedAt,
  },
  (t) => [
    index("lead_touches_block_idx").on(t.blockId),
    index("lead_touches_lead_idx").on(t.leadId),
    index("lead_touches_team_idx").on(t.teamId),
    index("lead_touches_status_idx").on(t.status),
    index("lead_touches_block_lead_idx").on(t.blockId, t.leadId),
  ],
);

// Relations
export const campaignBlocksRelations = relations(
  campaignBlocks,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [campaignBlocks.teamId],
      references: [teams.id],
    }),
    campaign: one(campaigns, {
      fields: [campaignBlocks.campaignId],
      references: [campaigns.id],
    }),
    touches: many(leadTouches),
  }),
);

export const leadTouchesRelations = relations(leadTouches, ({ one }) => ({
  team: one(teams, {
    fields: [leadTouches.teamId],
    references: [teams.id],
  }),
  block: one(campaignBlocks, {
    fields: [leadTouches.blockId],
    references: [campaignBlocks.id],
  }),
  lead: one(leads, {
    fields: [leadTouches.leadId],
    references: [leads.id],
  }),
}));

// Type exports
export type CampaignBlock = typeof campaignBlocks.$inferSelect;
export type NewCampaignBlock = typeof campaignBlocks.$inferInsert;
export type LeadTouch = typeof leadTouches.$inferSelect;
export type NewLeadTouch = typeof leadTouches.$inferInsert;
