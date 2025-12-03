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

  // === RealEstateAPI Property Identifiers ===
  propertyId: text("property_id"), // RealEstateAPI ID
  apn: text("apn"), // Assessor Parcel Number
  fips: text("fips"), // FIPS code
  legalDescription: text("legal_description"),
  subdivision: text("subdivision"),
  tract: text("tract"),
  block: text("block"),
  lot: text("lot"),
  // === Address ===
  propertyAddress: text("property_address"),
  propertyAddress2: text("property_address_2"),
  propertyCity: text("property_city"),
  propertyState: text("property_state"),
  propertyZip: text("property_zip"),
  propertyZip4: text("property_zip_4"),
  propertyCounty: text("property_county"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  censusTract: text("census_tract"),
  congressionalDistrict: text("congressional_district"),
  // === Property Classification ===
  propertyType: text("property_type"), // 'SFR' | 'Condo' | 'Townhouse' | 'Multi-Family' | 'Commercial' | 'Land' | 'Mobile'
  propertySubtype: text("property_subtype"), // 'Duplex' | 'Triplex' | 'Fourplex' | 'Apartment' | 'Retail' | 'Office' | 'Industrial' | 'Mixed Use'
  propertyClass: text("property_class"), // 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural' | 'Vacant Land'
  propertyUse: text("property_use"), // 'Single Family' | 'Investment' | 'Vacation' | 'Agricultural'
  zoning: text("zoning"), // 'R1' | 'R2' | 'C1' | 'M1' etc
  zoningDescription: text("zoning_description"),
  landUseCode: text("land_use_code"),
  // === Units (for multi-family) ===
  units: integer("units"),
  buildingCount: integer("building_count"),
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
  // === Primary Mortgage (1st Position) ===
  mtg1Amount: integer("mtg1_amount"),
  mtg1Date: date("mtg1_date"),
  mtg1LoanType: text("mtg1_loan_type"), // 'Conventional' | 'FHA' | 'VA' | 'USDA' | 'ARM' | 'Balloon'
  mtg1InterestRate: decimal("mtg1_interest_rate", { precision: 5, scale: 3 }),
  mtg1Term: integer("mtg1_term"), // months
  mtg1Lender: text("mtg1_lender"),
  mtg1DueDate: date("mtg1_due_date"),
  // === Secondary Mortgage (2nd Position) ===
  mtg2Amount: integer("mtg2_amount"),
  mtg2Date: date("mtg2_date"),
  mtg2LoanType: text("mtg2_loan_type"),
  mtg2InterestRate: decimal("mtg2_interest_rate", { precision: 5, scale: 3 }),
  mtg2Term: integer("mtg2_term"),
  mtg2Lender: text("mtg2_lender"),
  // === Combined Mortgage Info ===
  totalMortgageBalance: integer("total_mortgage_balance"),
  combinedLtv: decimal("combined_ltv", { precision: 5, scale: 2 }), // Loan-to-Value ratio
  // === Liens & Encumbrances ===
  lienAmount: integer("lien_amount"),
  lienType: text("lien_type"), // 'tax' | 'mechanic' | 'judgment' | 'hoa'
  lienDate: date("lien_date"),
  lienHolder: text("lien_holder"),
  // === Last Sale ===
  lastSaleDate: date("last_sale_date"),
  lastSaleAmount: integer("last_sale_amount"),
  lastSaleType: text("last_sale_type"), // 'arms_length' | 'foreclosure' | 'reo' | 'short_sale' | 'auction'
  lastSaleSeller: text("last_sale_seller"),
  lastSaleBuyer: text("last_sale_buyer"),
  lastSaleDocNumber: text("last_sale_doc_number"),
  // === Prior Sale ===
  priorSaleDate: date("prior_sale_date"),
  priorSaleAmount: integer("prior_sale_amount"),
  priorSaleType: text("prior_sale_type"),
  // === Calculated Fields ===
  appreciationSinceLastSale: integer("appreciation_since_last_sale"),
  appreciationPercent: decimal("appreciation_percent", { precision: 5, scale: 2 }),
  daysOnMarket: integer("days_on_market"),
  yearsOwned: decimal("years_owned", { precision: 4, scale: 1 }),
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
  // === Distress Flags ===
  preForeclosure: boolean("pre_foreclosure").default(false),
  preForeclosureDate: date("pre_foreclosure_date"),
  foreclosure: boolean("foreclosure").default(false),
  foreclosureDate: date("foreclosure_date"),
  foreclosureAuctionDate: date("foreclosure_auction_date"),
  reo: boolean("reo").default(false), // Bank-owned
  reoDate: date("reo_date"),
  bankruptcy: boolean("bankruptcy").default(false),
  bankruptcyDate: date("bankruptcy_date"),
  bankruptcyChapter: text("bankruptcy_chapter"), // '7' | '11' | '13'
  taxLien: boolean("tax_lien").default(false),
  taxLienAmount: integer("tax_lien_amount"),
  taxLienDate: date("tax_lien_date"),
  taxDelinquent: boolean("tax_delinquent").default(false),
  taxDelinquentYear: integer("tax_delinquent_year"),
  // === Opportunity Flags ===
  inherited: boolean("inherited").default(false),
  inheritedDate: date("inherited_date"),
  probate: boolean("probate").default(false),
  probateDate: date("probate_date"),
  divorce: boolean("divorce").default(false),
  vacant: boolean("vacant").default(false),
  vacantIndicator: text("vacant_indicator"), // Source of vacancy data
  tired: boolean("tired").default(false), // Landlord with old property
  cashBuyer: boolean("cash_buyer").default(false), // Previous cash buyer
  investor: boolean("investor").default(false), // Known investor
  outOfState: boolean("out_of_state").default(false), // Owner lives out of state
  outOfCounty: boolean("out_of_county").default(false),
  seniorOwner: boolean("senior_owner").default(false), // Owner 65+
  // === Equity Flags ===
  highEquity: boolean("high_equity").default(false), // 50%+ equity
  lowEquity: boolean("low_equity").default(false), // <20% equity
  negativeEquity: boolean("negative_equity").default(false), // Underwater
  freeClear: boolean("free_clear").default(false), // No mortgage
  // === Market Flags ===
  listedForSale: boolean("listed_for_sale").default(false),
  listedDate: date("listed_date"),
  listingPrice: integer("listing_price"),
  mlsNumber: text("mls_number"),
  daysOnMarket: integer("dom"),
  priceReduced: boolean("price_reduced").default(false),
  // === Quality Flags ===
  needsRepair: boolean("needs_repair").default(false),
  codeViolation: boolean("code_violation").default(false),
  permitPulled: boolean("permit_pulled").default(false),

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
