import {
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";

// Label categories for organization
export const labelCategoryEnum = pgEnum("label_category", [
  "status",        // Workflow status (new, contacted, qualified, etc.)
  "priority",      // Priority level (hot, warm, cold)
  "type",          // Lead type (investor, seller, buyer, etc.)
  "quality",       // Contact quality (verified, unverified, bounced)
  "property_type", // Property category (commercial, multi-family, etc.)
  "opportunity",   // Deal type (foreclosure, high-equity, portfolio)
  "custom",        // User-defined categories
]);

// Team-level label definitions
export const leadLabels = pgTable(
  "lead_labels",
  {
    id: primaryUlid("ll"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    name: varchar().notNull(),
    category: labelCategoryEnum().notNull(),
    color: varchar(), // Hex color for UI
    icon: varchar(),  // Icon name for UI
    description: varchar(),
    isSystem: varchar().default("false"), // System-defined (can't delete)
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.category),
    uniqueIndex().on(t.teamId, t.name, t.category),
  ],
);

// Lead-to-label relationships (many-to-many)
export const leadLabelLinks = pgTable(
  "lead_label_links",
  {
    id: primaryUlid("lll"),
    leadId: ulidColumn()
      .references(() => leads.id, {
        onDelete: "cascade",
      })
      .notNull(),
    labelId: ulidColumn()
      .references(() => leadLabels.id, {
        onDelete: "cascade",
      })
      .notNull(),
    createdAt,
  },
  (t) => [
    index().on(t.leadId),
    index().on(t.labelId),
    uniqueIndex().on(t.leadId, t.labelId),
  ],
);

// Lead flags for quick boolean checks
export const leadFlags = pgTable(
  "lead_flags",
  {
    id: primaryUlid("lf"),
    leadId: ulidColumn()
      .references(() => leads.id, {
        onDelete: "cascade",
      })
      .notNull(),

    // Contact Quality Flags
    verifiedEmail: varchar("verified_email").default("false"),
    verifiedPhone: varchar("verified_phone").default("false"),
    doNotCall: varchar("do_not_call").default("false"),
    emailBounced: varchar("email_bounced").default("false"),

    // Lead Quality Flags
    hotLead: varchar("hot_lead").default("false"),
    highValue: varchar("high_value").default("false"),
    quickClose: varchar("quick_close").default("false"),

    // Property Flags
    hasEquity: varchar("has_equity").default("false"),
    highEquity: varchar("high_equity").default("false"),
    freeClear: varchar("free_clear").default("false"),
    isInvestor: varchar("is_investor").default("false"),
    isActiveBuyer: varchar("is_active_buyer").default("false"),

    // Opportunity Flags
    distressed: varchar("distressed").default("false"),
    preForeclosure: varchar("pre_foreclosure").default("false"),
    vacant: varchar("vacant").default("false"),
    absenteeOwner: varchar("absentee_owner").default("false"),

    // Engagement Flags
    responded: varchar("responded").default("false"),
    scheduled: varchar("scheduled").default("false"),
    converted: varchar("converted").default("false"),

    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.leadId),
    index().on(t.hotLead),
    index().on(t.highValue),
    index().on(t.isInvestor),
  ],
);
