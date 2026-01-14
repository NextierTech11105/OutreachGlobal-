import {
  index,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { users } from "./users.schema";

/**
 * Team Shares - Enable cross-team sharing of leads, campaigns, and templates
 *
 * This is DIFFERENT from shared_links:
 * - shared_links: External link-based sharing (anyone with URL)
 * - team_shares: Internal platform sharing (team to team)
 *
 * Use Cases:
 * - Franchise: HQ shares campaign templates to all franchisees
 * - Referral: Agency A refers a lead to Agency B
 * - Partnership: Two agencies collaborate on a deal
 * - Marketplace: Sell/share campaign templates
 */

export const TEAM_SHARE_PK = "tsh";

// What can be shared between teams
export type ShareableResourceType =
  | "lead"
  | "campaign"
  | "campaign_template"
  | "lead_list"
  | "bucket";

// Permission levels
export type SharePermission = "view" | "edit" | "full" | "clone_only";

export const teamShares = pgTable(
  "team_shares",
  {
    id: primaryUlid(TEAM_SHARE_PK),

    // Source team (who is sharing)
    sourceTeamId: teamsRef({ onDelete: "cascade" }).notNull(),
    sharedBy: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    // Target team (who receives the share)
    targetTeamId: ulidColumn().notNull(), // Can't use teamsRef twice, use raw ulid
    acceptedBy: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    // What is being shared
    resourceType: varchar("resource_type")
      .notNull()
      .$type<ShareableResourceType>(),
    resourceId: varchar("resource_id").notNull(),
    resourceName: varchar("resource_name"), // Display name for UI

    // Permission level
    permission: varchar("permission")
      .notNull()
      .default("view")
      .$type<SharePermission>(),

    // Share status
    status: varchar("status")
      .notNull()
      .default("pending")
      .$type<"pending" | "accepted" | "declined" | "revoked">(),

    // Optional message from sharer
    message: text("message"),

    // Metadata
    metadata: jsonb("metadata"), // Additional context (e.g., referral fee %)

    // Expiration (optional - null = permanent)
    expiresAt: timestamp("expires_at"),

    // Timestamps
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    revokedAt: timestamp("revoked_at"),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("team_shares_source_idx").on(t.sourceTeamId),
    index("team_shares_target_idx").on(t.targetTeamId),
    index("team_shares_resource_idx").on(t.resourceType, t.resourceId),
    index("team_shares_status_idx").on(t.status),
  ],
);

/**
 * Campaign Templates - Shareable campaign configurations
 *
 * A campaign template is a reusable campaign setup that can be:
 * - Used by the creating team
 * - Shared with other teams
 * - Sold in a marketplace
 */

export const CAMPAIGN_TEMPLATE_PK = "ctpl";

export const campaignTemplates = pgTable(
  "campaign_templates",
  {
    id: primaryUlid(CAMPAIGN_TEMPLATE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    createdBy: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),

    // Template info
    name: varchar("name").notNull(),
    description: text("description"),
    category: varchar("category"), // e.g., "exit_planning", "m&a", "real_estate"

    // Template content
    templateData: jsonb("template_data").notNull().$type<{
      // Campaign settings
      campaignType: string;
      workerSequence: string[]; // ["gianna", "cathy", "sabrina"]

      // Message templates
      messages: {
        workerId: string;
        stage: string;
        template: string;
        delayHours?: number;
      }[];

      // ICP targeting
      targetingRules?: {
        revenue?: { min?: number; max?: number };
        industry?: string[];
        location?: string[];
      };

      // Scheduling
      sendWindows?: {
        days: string[];
        startHour: number;
        endHour: number;
        timezone: string;
      };
    }>(),

    // Sharing settings
    isPublic: boolean("is_public").notNull().default(false), // Visible in marketplace
    isShareable: boolean("is_shareable").notNull().default(true), // Can be shared to other teams
    price: varchar("price"), // If selling in marketplace (null = free)

    // Stats
    useCount: jsonb("use_count").default(0), // How many times cloned/used
    rating: jsonb("rating"), // User ratings

    // Status
    isActive: boolean("is_active").notNull().default(true),

    createdAt,
    updatedAt,
  },
  (t) => [
    index("campaign_templates_team_idx").on(t.teamId),
    index("campaign_templates_category_idx").on(t.category),
    index("campaign_templates_public_idx").on(t.isPublic),
  ],
);

// Types
export type TeamShare = typeof teamShares.$inferSelect;
export type NewTeamShare = typeof teamShares.$inferInsert;
export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type NewCampaignTemplate = typeof campaignTemplates.$inferInsert;
