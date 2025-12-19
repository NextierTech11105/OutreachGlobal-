import {
  index,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { users } from "./users.schema";
import { leads } from "./leads.schema";
import { properties } from "./properties.schema";

/**
 * Shared Links - Enable instant sharing of leads, valuation reports, and other resources
 * 
 * Usage:
 * - Share a lead with team members: /share/shl_abc123
 * - Share a valuation report: /share/shl_xyz789
 * - Time-limited or permanent links
 * - Track who views the shared content
 */

export const SHARED_LINK_PK = "shl";

// Valid resource types that can be shared
export type SharedResourceType = 
  | "lead" 
  | "valuation_report" 
  | "property" 
  | "bucket" 
  | "campaign";

export const sharedLinks = pgTable(
  "shared_links",
  {
    id: primaryUlid(SHARED_LINK_PK),
    
    // Who created the share
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    createdBy: ulidColumn().references(() => users.id, { onDelete: "set null" }),
    
    // What is being shared
    resourceType: varchar("resource_type").notNull().$type<SharedResourceType>(),
    resourceId: varchar("resource_id").notNull(), // The ID of the lead, report, etc.
    
    // Share token - short, URL-safe identifier
    token: varchar("token").notNull().unique(),
    
    // Optional: restrict to specific team members or emails
    allowedEmails: text("allowed_emails").array(), // If set, only these emails can view
    allowedUserIds: text("allowed_user_ids").array(), // If set, only these users can view
    
    // Access control
    isPublic: boolean("is_public").notNull().default(false), // true = anyone with link, false = team only
    requireAuth: boolean("require_auth").notNull().default(true), // Require login to view
    
    // Expiration
    expiresAt: timestamp("expires_at"), // null = never expires
    
    // Usage tracking
    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at"),
    lastViewedBy: ulidColumn().references(() => users.id, { onDelete: "set null" }),
    
    // Optional custom data (for valuation reports, include snapshot of data)
    snapshotData: jsonb("snapshot_data"), // Store a snapshot of the shared resource
    
    // Soft delete
    isActive: boolean("is_active").notNull().default(true),
    
    createdAt,
    updatedAt,
  },
  (t) => [
    index("shared_links_team_idx").on(t.teamId),
    index("shared_links_token_idx").on(t.token),
    index("shared_links_resource_idx").on(t.resourceType, t.resourceId),
    index("shared_links_created_by_idx").on(t.createdBy),
  ]
);

// Track who has viewed shared links (audit trail)
export const sharedLinkViews = pgTable(
  "shared_link_views",
  {
    id: primaryUlid("slv"),
    sharedLinkId: ulidColumn().references(() => sharedLinks.id, { onDelete: "cascade" }).notNull(),
    
    // Who viewed
    viewerId: ulidColumn().references(() => users.id, { onDelete: "set null" }),
    viewerEmail: varchar("viewer_email"), // If viewed by authenticated user
    viewerIp: varchar("viewer_ip"), // For anonymous views
    
    // When and how
    viewedAt: timestamp("viewed_at").defaultNow().notNull(),
    userAgent: text("user_agent"),
    
    createdAt,
  },
  (t) => [
    index("shared_link_views_link_idx").on(t.sharedLinkId),
    index("shared_link_views_viewer_idx").on(t.viewerId),
  ]
);

// Types for use in application code
export type SharedLink = typeof sharedLinks.$inferSelect;
export type NewSharedLink = typeof sharedLinks.$inferInsert;
export type SharedLinkView = typeof sharedLinkViews.$inferSelect;
export type NewSharedLinkView = typeof sharedLinkViews.$inferInsert;
