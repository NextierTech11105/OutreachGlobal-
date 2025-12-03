import { pgTable, text, timestamp, jsonb, integer, boolean, uuid, decimal, date, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// BUCKETS - Saved searches with lead management
// ============================================================

export const buckets = pgTable("buckets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  source: text("source").notNull().default("real-estate"), // 'real-estate' | 'apollo' | 'mixed'
  filters: jsonb("filters").notNull().default({}), // BucketFilters JSON
  // Counts (denormalized for performance)
  totalLeads: integer("total_leads").default(0),
  enrichedLeads: integer("enriched_leads").default(0),
  queuedLeads: integer("queued_leads").default(0),
  contactedLeads: integer("contacted_leads").default(0),
  // Enrichment tracking
  enrichmentStatus: text("enrichment_status").default("pending"), // 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  enrichmentProgress: jsonb("enrichment_progress"), // { total, processed, successful, failed }
  queuedAt: timestamp("queued_at"),
  lastEnrichedAt: timestamp("last_enriched_at"),
  // Campaign link
  campaignId: uuid("campaign_id"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("buckets_user_id_idx").on(table.userId),
  sourceIdx: index("buckets_source_idx").on(table.source),
  statusIdx: index("buckets_enrichment_status_idx").on(table.enrichmentStatus),
}));

// ============================================================
// LEADS - Full RealEstateAPI + Apollo merged data
// ============================================================

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucketId: uuid("bucket_id").notNull().references(() => buckets.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  source: text("source").notNull().default("real-estate"), // 'real-estate' | 'apollo' | 'mixed'
  status: text("status").notNull().default("new"), // 'new' | 'contacted' | 'qualified' | 'nurturing' | 'closed' | 'lost'

  // === Contact Info ===
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  secondaryPhone: text("secondary_phone"),

  // === RealEstateAPI Property Data ===
  propertyId: text("property_id"), // RealEstateAPI ID
  propertyAddress: text("property_address"),
  propertyCity: text("property_city"),
  propertyState: text("property_state"),
  propertyZip: text("property_zip"),
  propertyCounty: text("property_county"),
  propertyType: text("property_type"), // 'SFR' | 'Multi-Family' | 'Commercial' etc
  propertySubtype: text("property_subtype"),
  // Physical characteristics
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  sqft: integer("sqft"),
  lotSizeSqft: integer("lot_size_sqft"),
  lotSizeAcres: decimal("lot_size_acres", { precision: 10, scale: 4 }),
  yearBuilt: integer("year_built"),
  stories: integer("stories"),
  pool: boolean("pool"),
  garage: boolean("garage"),
  garageSpaces: integer("garage_spaces"),
  // Valuation
  estimatedValue: integer("estimated_value"),
  assessedValue: integer("assessed_value"),
  taxAmount: integer("tax_amount"),
  estimatedEquity: integer("estimated_equity"),
  equityPercent: decimal("equity_percent", { precision: 5, scale: 2 }),
  // Mortgage/Lien
  mortgageBalance: integer("mortgage_balance"),
  mortgageRate: decimal("mortgage_rate", { precision: 5, scale: 3 }),
  mortgageLender: text("mortgage_lender"),
  mortgageDate: date("mortgage_date"),
  lienAmount: integer("lien_amount"),
  // Sale history
  lastSaleDate: date("last_sale_date"),
  lastSaleAmount: integer("last_sale_amount"),
  priorSaleDate: date("prior_sale_date"),
  priorSaleAmount: integer("prior_sale_amount"),
  // Owner info from RealEstateAPI
  owner1FirstName: text("owner1_first_name"),
  owner1LastName: text("owner1_last_name"),
  owner2FirstName: text("owner2_first_name"),
  owner2LastName: text("owner2_last_name"),
  ownerType: text("owner_type"), // 'individual' | 'trust' | 'corporation' | 'llc'
  ownerOccupied: boolean("owner_occupied"),
  absenteeOwner: boolean("absentee_owner"),
  // Mailing address (from skip trace)
  mailingAddress: text("mailing_address"),
  mailingCity: text("mailing_city"),
  mailingState: text("mailing_state"),
  mailingZip: text("mailing_zip"),
  // Flags from RealEstateAPI
  preForeclosure: boolean("pre_foreclosure").default(false),
  foreclosure: boolean("foreclosure").default(false),
  bankruptcy: boolean("bankruptcy").default(false),
  taxLien: boolean("tax_lien").default(false),
  inherited: boolean("inherited").default(false),
  vacant: boolean("vacant").default(false),
  highEquity: boolean("high_equity").default(false),
  freeClear: boolean("free_clear").default(false),

  // === Apollo.io Data ===
  apolloPersonId: text("apollo_person_id"),
  apolloOrgId: text("apollo_org_id"),
  apolloTitle: text("apollo_title"),
  apolloCompany: text("apollo_company"),
  apolloCompanyDomain: text("apollo_company_domain"),
  apolloIndustry: text("apollo_industry"),
  apolloRevenue: integer("apollo_revenue"),
  apolloRevenueRange: text("apollo_revenue_range"),
  apolloEmployeeCount: integer("apollo_employee_count"),
  apolloEmployeeRange: text("apollo_employee_range"),
  apolloLinkedinUrl: text("apollo_linkedin_url"),
  apolloIntentScore: integer("apollo_intent_score"),
  apolloSignals: jsonb("apollo_signals").default([]), // string[]
  apolloFoundedYear: integer("apollo_founded_year"),
  apolloTechnologies: jsonb("apollo_technologies").default([]), // string[]
  apolloKeywords: jsonb("apollo_keywords").default([]), // string[]

  // === Enrichment Metadata ===
  enrichmentStatus: text("enrichment_status").default("pending"),
  enrichedAt: timestamp("enriched_at"),
  enrichmentError: text("enrichment_error"),
  skipTracedAt: timestamp("skip_traced_at"),

  // === Activity Tracking ===
  lastActivityAt: timestamp("last_activity_at"),
  lastActivityType: text("last_activity_type"), // 'email' | 'call' | 'sms' | 'meeting'
  activityCount: integer("activity_count").default(0),
  notes: text("notes"),

  // === Timestamps ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  bucketIdIdx: index("leads_bucket_id_idx").on(table.bucketId),
  userIdIdx: index("leads_user_id_idx").on(table.userId),
  propertyIdIdx: index("leads_property_id_idx").on(table.propertyId),
  statusIdx: index("leads_status_idx").on(table.status),
  stateIdx: index("leads_property_state_idx").on(table.propertyState),
  enrichmentIdx: index("leads_enrichment_status_idx").on(table.enrichmentStatus),
}));

// ============================================================
// TAGS - Custom and auto-generated tags
// ============================================================

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"), // null = system tag
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color").default("#6366f1"), // hex color
  description: text("description"),
  isSystem: boolean("is_system").default(false), // auto-generated tags
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("tags_slug_idx").on(table.slug),
  userIdIdx: index("tags_user_id_idx").on(table.userId),
}));

// Lead-Tag junction table
export const leadTags = pgTable("lead_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  isAutoTag: boolean("is_auto_tag").default(false), // true if applied by auto-tagging rule
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  appliedBy: text("applied_by"), // user_id or 'system'
}, (table) => ({
  leadTagIdx: index("lead_tags_lead_tag_idx").on(table.leadId, table.tagId),
}));

// Bucket-Tag junction table
export const bucketTags = pgTable("bucket_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucketId: uuid("bucket_id").notNull().references(() => buckets.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
}, (table) => ({
  bucketTagIdx: index("bucket_tags_bucket_tag_idx").on(table.bucketId, table.tagId),
}));

// ============================================================
// AUTO-TAGGING RULES
// ============================================================

export const autoTagRules = pgTable("auto_tag_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"), // null = global rule
  name: text("name").notNull(),
  description: text("description"),
  // Condition
  field: text("field").notNull(), // e.g., 'estimatedEquity', 'apolloRevenue', 'propertyType'
  operator: text("operator").notNull(), // 'gte' | 'lte' | 'eq' | 'contains' | 'exists'
  value: text("value").notNull(), // stored as string, parsed based on field type
  // Tag to apply
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  // Settings
  priority: integer("priority").default(0), // higher = applied first
  isActive: boolean("is_active").default(true),
  applyToExisting: boolean("apply_to_existing").default(false), // apply to existing leads on save
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// RELATIONS
// ============================================================

export const bucketsRelations = relations(buckets, ({ many }) => ({
  leads: many(leads),
  bucketTags: many(bucketTags),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  bucket: one(buckets, { fields: [leads.bucketId], references: [buckets.id] }),
  leadTags: many(leadTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  leadTags: many(leadTags),
  bucketTags: many(bucketTags),
  autoTagRules: many(autoTagRules),
}));

export const leadTagsRelations = relations(leadTags, ({ one }) => ({
  lead: one(leads, { fields: [leadTags.leadId], references: [leads.id] }),
  tag: one(tags, { fields: [leadTags.tagId], references: [tags.id] }),
}));

export const bucketTagsRelations = relations(bucketTags, ({ one }) => ({
  bucket: one(buckets, { fields: [bucketTags.bucketId], references: [buckets.id] }),
  tag: one(tags, { fields: [bucketTags.tagId], references: [tags.id] }),
}));

export const autoTagRulesRelations = relations(autoTagRules, ({ one }) => ({
  tag: one(tags, { fields: [autoTagRules.tagId], references: [tags.id] }),
}));

// ============================================================
// LEGACY - Saved property searches (keeping for compatibility)
// ============================================================

// Saved property searches
export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  query: jsonb("query").notNull(), // PropertySearchQuery JSON
  resultCount: integer("result_count").default(0),
  isActive: boolean("is_active").default(true),
  notifyOnChanges: boolean("notify_on_changes").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastRunAt: timestamp("last_run_at"),
});

// Property IDs tracked by saved searches
export const savedSearchPropertyIds = pgTable("saved_search_property_ids", {
  id: uuid("id").primaryKey().defaultRandom(),
  savedSearchId: uuid("saved_search_id").notNull().references(() => savedSearches.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"),
  isActive: boolean("is_active").default(true),
});

// Change events when properties enter/leave saved searches
export const propertyChangeEvents = pgTable("property_change_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  savedSearchId: uuid("saved_search_id").notNull().references(() => savedSearches.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull(),
  eventType: text("event_type").notNull(), // 'added' | 'removed'
  propertySnapshot: jsonb("property_snapshot"), // Store property data at time of event
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports for TypeScript
export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;
export type SavedSearchPropertyId = typeof savedSearchPropertyIds.$inferSelect;
export type PropertyChangeEvent = typeof propertyChangeEvents.$inferSelect;

// New schema types
export type Bucket = typeof buckets.$inferSelect;
export type NewBucket = typeof buckets.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type LeadTag = typeof leadTags.$inferSelect;
export type BucketTag = typeof bucketTags.$inferSelect;
export type AutoTagRule = typeof autoTagRules.$inferSelect;
export type NewAutoTagRule = typeof autoTagRules.$inferInsert;
