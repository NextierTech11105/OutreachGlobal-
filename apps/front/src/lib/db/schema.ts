import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uuid,
  decimal,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// BUCKETS - Saved searches with lead management
// ============================================================

export const buckets = pgTable(
  "buckets",
  {
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
  },
  (table) => ({
    userIdIdx: index("buckets_user_id_idx").on(table.userId),
    sourceIdx: index("buckets_source_idx").on(table.source),
    statusIdx: index("buckets_enrichment_status_idx").on(
      table.enrichmentStatus,
    ),
  }),
);

// ============================================================
// LEADS - Matches actual API database schema
// Note: The API owns the database schema. Frontend queries same DB.
// See: apps/api/src/database/schema/leads.schema.ts for source of truth
// ============================================================

export const leads = pgTable(
  "leads",
  {
    // The actual DB uses ULID with 'lead_' prefix, but we query by the full id
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    integrationId: text("integration_id"),
    propertyId: text("property_id"),
    position: integer("position").default(0),
    externalId: text("external_id"),

    // === Contact Info (actual DB columns) ===
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    title: text("title"),
    company: text("company"),

    // === Status & Scoring ===
    status: text("status").default("new"),
    score: integer("score").default(0),
    tags: text("tags").array(),

    // === Address (actual column names - NOT propertyAddress) ===
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    country: text("country"),

    // === Additional Info ===
    source: text("source"),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    customFields: jsonb("custom_fields"),

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("leads_team_id_idx").on(table.teamId),
    statusIdx: index("leads_status_idx").on(table.status),
    scoreIdx: index("leads_score_idx").on(table.score),
  }),
);

// ============================================================
// TAGS - Custom and auto-generated tags
// ============================================================

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"), // null = system tag
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    color: text("color").default("#6366f1"), // hex color
    description: text("description"),
    isSystem: boolean("is_system").default(false), // auto-generated tags
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index("tags_slug_idx").on(table.slug),
    userIdIdx: index("tags_user_id_idx").on(table.userId),
  }),
);

// Lead-Tag junction table
export const leadTags = pgTable(
  "lead_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    isAutoTag: boolean("is_auto_tag").default(false), // true if applied by auto-tagging rule
    appliedAt: timestamp("applied_at").defaultNow().notNull(),
    appliedBy: text("applied_by"), // user_id or 'system'
  },
  (table) => ({
    leadTagIdx: index("lead_tags_lead_tag_idx").on(table.leadId, table.tagId),
  }),
);

// Bucket-Tag junction table
export const bucketTags = pgTable(
  "bucket_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    appliedAt: timestamp("applied_at").defaultNow().notNull(),
  },
  (table) => ({
    bucketTagIdx: index("bucket_tags_bucket_tag_idx").on(
      table.bucketId,
      table.tagId,
    ),
  }),
);

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
  tagId: uuid("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
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
  bucket: one(buckets, {
    fields: [bucketTags.bucketId],
    references: [buckets.id],
  }),
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
  savedSearchId: uuid("saved_search_id")
    .notNull()
    .references(() => savedSearches.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"),
  isActive: boolean("is_active").default(true),
});

// Change events when properties enter/leave saved searches
export const propertyChangeEvents = pgTable("property_change_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  savedSearchId: uuid("saved_search_id")
    .notNull()
    .references(() => savedSearches.id, { onDelete: "cascade" }),
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

// ============================================================
// DATA LAKE - Raw data ingestion and organization
// ============================================================

/**
 * DATA SOURCES - Track imported files and API feeds
 * Examples: USBizData CSVs, RealEstateAPI feeds, Apollo exports
 */
export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),

    // Source identification
    name: text("name").notNull(), // "NY Business Database 2024"
    slug: text("slug").notNull(), // "ny-business-db-2024"
    sourceType: text("source_type").notNull(), // 'csv' | 'api' | 'manual' | 'scrape'
    sourceProvider: text("source_provider"), // 'usbizdata' | 'realestateapi' | 'apollo' | 'custom'

    // File metadata (for CSV imports)
    fileName: text("file_name"),
    fileSize: integer("file_size"), // bytes
    fileHash: text("file_hash"), // MD5 for dedup

    // Schema mapping
    columnMapping: jsonb("column_mapping").default({}), // { csvColumn: schemaField }
    originalHeaders: jsonb("original_headers").default([]), // string[]

    // Processing status
    status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
    totalRows: integer("total_rows").default(0),
    processedRows: integer("processed_rows").default(0),
    errorRows: integer("error_rows").default(0),
    errorLog: jsonb("error_log").default([]), // Array of { row, error }

    // Sector association
    primarySectorId: text("primary_sector_id"), // e.g., "healthcare", "restaurants_food"
    sectorCategory: text("sector_category"), // 'real_estate' | 'business' | 'financial' | 'geographic'

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    userIdIdx: index("data_sources_user_id_idx").on(table.userId),
    slugIdx: index("data_sources_slug_idx").on(table.slug),
    statusIdx: index("data_sources_status_idx").on(table.status),
    sectorIdx: index("data_sources_sector_idx").on(table.primarySectorId),
  }),
);

/**
 * BUSINESSES - B2B entities from USBizData and other sources
 * Core business data lake table for company information
 */
export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").notNull(),

    // === Business Identifiers ===
    externalId: text("external_id"), // Original ID from source
    ein: text("ein"), // Employer ID Number
    duns: text("duns"), // D&B DUNS Number

    // === Company Info ===
    companyName: text("company_name").notNull(),
    dba: text("dba"), // Doing Business As
    legalName: text("legal_name"),
    entityType: text("entity_type"), // 'llc' | 'corp' | 'sole_prop' | 'partnership' | 'nonprofit'

    // === Address ===
    address: text("address"),
    address2: text("address_2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    zip4: text("zip_4"),
    county: text("county"),
    country: text("country").default("US"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),

    // === Contact Info ===
    phone: text("phone"),
    phoneAlt: text("phone_alt"),
    fax: text("fax"),
    email: text("email"),
    website: text("website"),

    // === Classification ===
    sicCode: text("sic_code"), // Primary SIC
    sicCode2: text("sic_code_2"),
    sicCode3: text("sic_code_3"),
    sicDescription: text("sic_description"),
    naicsCode: text("naics_code"),
    naicsDescription: text("naics_description"),

    // === Size & Revenue ===
    employeeCount: integer("employee_count"),
    employeeRange: text("employee_range"), // '1-10' | '11-50' | '51-200' | '201-500' | '500+'
    annualRevenue: integer("annual_revenue"),
    revenueRange: text("revenue_range"), // 'Under 500K' | '500K-1M' | '1M-5M' | '5M-10M' | '10M+'
    salesVolume: text("sales_volume"),

    // === Business Details ===
    yearEstablished: integer("year_established"),
    yearsInBusiness: integer("years_in_business"),
    isHeadquarters: boolean("is_headquarters").default(true),
    parentCompany: text("parent_company"),
    franchiseFlag: boolean("franchise_flag").default(false),

    // === Owner/Executive Info ===
    ownerName: text("owner_name"),
    ownerFirstName: text("owner_first_name"),
    ownerLastName: text("owner_last_name"),
    ownerTitle: text("owner_title"),
    ownerGender: text("owner_gender"),
    ownerPhone: text("owner_phone"),
    ownerEmail: text("owner_email"),

    // === Additional Contacts ===
    executiveName: text("executive_name"),
    executiveTitle: text("executive_title"),
    executivePhone: text("executive_phone"),
    executiveEmail: text("executive_email"),

    // === Sector Assignment ===
    primarySectorId: text("primary_sector_id"), // From sectors.ts
    secondarySectorIds: jsonb("secondary_sector_ids").default([]), // string[]
    sectorCategory: text("sector_category"), // 'business' | 'real_estate' etc

    // === Enrichment Status ===
    enrichmentStatus: text("enrichment_status").default("pending"),
    apolloMatched: boolean("apollo_matched").default(false),
    apolloOrgId: text("apollo_org_id"),
    skipTraced: boolean("skip_traced").default(false),
    skipTracedAt: timestamp("skip_traced_at"),

    // === Engagement ===
    status: text("status").default("new"), // 'new' | 'contacted' | 'qualified' | 'customer' | 'churned'
    score: integer("score").default(0), // Lead score 0-100
    lastContactedAt: timestamp("last_contacted_at"),
    notes: text("notes"),

    // === Raw Data ===
    rawData: jsonb("raw_data"), // Original row from CSV

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("businesses_user_id_idx").on(table.userId),
    dataSourceIdx: index("businesses_data_source_idx").on(table.dataSourceId),
    companyNameIdx: index("businesses_company_name_idx").on(table.companyName),
    sicCodeIdx: index("businesses_sic_code_idx").on(table.sicCode),
    stateIdx: index("businesses_state_idx").on(table.state),
    cityIdx: index("businesses_city_idx").on(table.city),
    sectorIdx: index("businesses_sector_idx").on(table.primarySectorId),
    statusIdx: index("businesses_status_idx").on(table.status),
  }),
);

/**
 * PROPERTIES - Enhanced property table for data lake
 * Extends RealEstateAPI data with sector organization
 */
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").notNull(),

    // === External IDs ===
    realEstateApiId: text("realestate_api_id"), // RealEstateAPI property ID
    apn: text("apn"), // Assessor Parcel Number
    fips: text("fips"),

    // === Address ===
    address: text("address"),
    address2: text("address_2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    zip4: text("zip_4"),
    county: text("county"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),

    // === Property Type ===
    propertyType: text("property_type"), // 'SFR' | 'MFR' | 'CONDO' | 'LAND' | 'MOBILE' | 'OTHER'
    propertySubtype: text("property_subtype"),
    propertyClass: text("property_class"), // 'residential' | 'commercial' | 'industrial' | 'land'
    zoning: text("zoning"),

    // === Physical ===
    bedrooms: integer("bedrooms"),
    bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
    sqft: integer("sqft"),
    lotSizeSqft: integer("lot_size_sqft"),
    lotSizeAcres: decimal("lot_size_acres", { precision: 10, scale: 4 }),
    yearBuilt: integer("year_built"),
    stories: integer("stories"),
    units: integer("units"),

    // === Owner Info ===
    ownerName: text("owner_name"),
    owner1FirstName: text("owner1_first_name"),
    owner1LastName: text("owner1_last_name"),
    owner2FirstName: text("owner2_first_name"),
    owner2LastName: text("owner2_last_name"),
    ownerType: text("owner_type"), // 'individual' | 'trust' | 'corp' | 'llc'
    ownerOccupied: boolean("owner_occupied"),
    absenteeOwner: boolean("absentee_owner"),

    // === Mailing Address ===
    mailingAddress: text("mailing_address"),
    mailingCity: text("mailing_city"),
    mailingState: text("mailing_state"),
    mailingZip: text("mailing_zip"),

    // === Valuation ===
    estimatedValue: integer("estimated_value"),
    assessedValue: integer("assessed_value"),
    taxAmount: integer("tax_amount"),
    estimatedEquity: integer("estimated_equity"),
    equityPercent: decimal("equity_percent", { precision: 5, scale: 2 }),

    // === Mortgage ===
    mtg1Amount: integer("mtg1_amount"),
    mtg1LoanType: text("mtg1_loan_type"), // 'conventional' | 'fha' | 'va' | 'rev' (reverse)
    mtg1Lender: text("mtg1_lender"),
    mtg1Date: date("mtg1_date"),
    freeClear: boolean("free_clear").default(false),

    // === Distress Flags ===
    preForeclosure: boolean("pre_foreclosure").default(false),
    foreclosure: boolean("foreclosure").default(false),
    taxLien: boolean("tax_lien").default(false),
    taxDelinquent: boolean("tax_delinquent").default(false),
    bankruptcy: boolean("bankruptcy").default(false),

    // === Opportunity Flags ===
    inherited: boolean("inherited").default(false),
    probate: boolean("probate").default(false),
    vacant: boolean("vacant").default(false),
    highEquity: boolean("high_equity").default(false),
    reverseMortgage: boolean("reverse_mortgage").default(false),
    compulinkLender: boolean("compulink_lender").default(false),

    // === Skip Trace Data ===
    phones: jsonb("phones").default([]), // string[]
    emails: jsonb("emails").default([]), // string[]
    skipTraced: boolean("skip_traced").default(false),
    skipTracedAt: timestamp("skip_traced_at"),

    // === Sector Assignment ===
    primarySectorId: text("primary_sector_id"),
    secondarySectorIds: jsonb("secondary_sector_ids").default([]),
    sectorCategory: text("sector_category"), // 'real_estate' | 'financial' | 'geographic'
    leadTypes: jsonb("lead_types").default([]), // ['pre_foreclosure', 'high_equity', etc]

    // === Status & Engagement ===
    status: text("status").default("new"),
    score: integer("score").default(0),
    lastContactedAt: timestamp("last_contacted_at"),
    notes: text("notes"),

    // === Raw Data ===
    rawData: jsonb("raw_data"),

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("properties_user_id_idx").on(table.userId),
    dataSourceIdx: index("properties_data_source_idx").on(table.dataSourceId),
    realEstateApiIdIdx: index("properties_realestate_api_id_idx").on(
      table.realEstateApiId,
    ),
    apnIdx: index("properties_apn_idx").on(table.apn),
    stateIdx: index("properties_state_idx").on(table.state),
    countyIdx: index("properties_county_idx").on(table.county),
    cityIdx: index("properties_city_idx").on(table.city),
    propertyTypeIdx: index("properties_property_type_idx").on(
      table.propertyType,
    ),
    sectorIdx: index("properties_sector_idx").on(table.primarySectorId),
    statusIdx: index("properties_status_idx").on(table.status),
  }),
);

/**
 * CONTACTS - Unified contact records from all sources
 * Links to businesses and properties
 */
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, {
      onDelete: "set null",
    }),

    // === Links ===
    businessId: uuid("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    leadId: uuid("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),

    // === Contact Info ===
    firstName: text("first_name"),
    lastName: text("last_name"),
    fullName: text("full_name"),
    title: text("title"),
    email: text("email"),
    emailVerified: boolean("email_verified").default(false),
    phone: text("phone"),
    phoneType: text("phone_type"), // 'mobile' | 'home' | 'work' | 'fax'
    phoneVerified: boolean("phone_verified").default(false),
    phoneAlt: text("phone_alt"),

    // === Address ===
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),

    // === Social ===
    linkedinUrl: text("linkedin_url"),
    facebookUrl: text("facebook_url"),
    twitterUrl: text("twitter_url"),

    // === Source & Quality ===
    sourceType: text("source_type"), // 'skip_trace' | 'apollo' | 'csv' | 'manual'
    confidenceScore: integer("confidence_score"), // 0-100

    // === Status ===
    status: text("status").default("active"), // 'active' | 'dnc' | 'invalid' | 'bounced'
    optedOut: boolean("opted_out").default(false),
    lastContactedAt: timestamp("last_contacted_at"),

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("contacts_user_id_idx").on(table.userId),
    businessIdIdx: index("contacts_business_id_idx").on(table.businessId),
    propertyIdIdx: index("contacts_property_id_idx").on(table.propertyId),
    emailIdx: index("contacts_email_idx").on(table.email),
    phoneIdx: index("contacts_phone_idx").on(table.phone),
    statusIdx: index("contacts_status_idx").on(table.status),
  }),
);

/**
 * SECTOR ASSIGNMENTS - Link entities to multiple sectors
 * Enables cross-sector analysis and targeting
 */
export const sectorAssignments = pgTable(
  "sector_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),

    // === Entity Reference (polymorphic) ===
    entityType: text("entity_type").notNull(), // 'business' | 'property' | 'lead' | 'contact'
    entityId: uuid("entity_id").notNull(),

    // === Sector ===
    sectorId: text("sector_id").notNull(), // e.g., "healthcare", "pre_foreclosure"
    sectorCategory: text("sector_category").notNull(), // 'real_estate' | 'business' | 'financial' | 'geographic'

    // === Assignment Metadata ===
    isPrimary: boolean("is_primary").default(false),
    confidence: integer("confidence").default(100), // 0-100, how confident the assignment is
    assignedBy: text("assigned_by"), // 'system' | 'user' | 'rule:{rule_id}'

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("sector_assignments_user_id_idx").on(table.userId),
    entityIdx: index("sector_assignments_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    sectorIdx: index("sector_assignments_sector_idx").on(table.sectorId),
    categoryIdx: index("sector_assignments_category_idx").on(
      table.sectorCategory,
    ),
  }),
);

/**
 * IMPORT JOBS - Track CSV/data import progress
 */
export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, {
      onDelete: "cascade",
    }),

    // === Job Info ===
    jobType: text("job_type").notNull(), // 'csv_import' | 'api_sync' | 'enrichment'
    status: text("status").notNull().default("pending"), // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

    // === Progress ===
    totalItems: integer("total_items").default(0),
    processedItems: integer("processed_items").default(0),
    successItems: integer("success_items").default(0),
    errorItems: integer("error_items").default(0),

    // === Configuration ===
    config: jsonb("config").default({}), // Job-specific settings

    // === Results ===
    result: jsonb("result"), // Final summary
    errorLog: jsonb("error_log").default([]),

    // === Timestamps ===
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("import_jobs_user_id_idx").on(table.userId),
    dataSourceIdx: index("import_jobs_data_source_idx").on(table.dataSourceId),
    statusIdx: index("import_jobs_status_idx").on(table.status),
  }),
);

// ============================================================
// DATA LAKE RELATIONS
// ============================================================

export const dataSourcesRelations = relations(dataSources, ({ many }) => ({
  businesses: many(businesses),
  properties: many(properties),
  contacts: many(contacts),
  importJobs: many(importJobs),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  dataSource: one(dataSources, {
    fields: [businesses.dataSourceId],
    references: [dataSources.id],
  }),
  contacts: many(contacts),
  sectorAssignments: many(sectorAssignments),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  dataSource: one(dataSources, {
    fields: [properties.dataSourceId],
    references: [dataSources.id],
  }),
  contacts: many(contacts),
  sectorAssignments: many(sectorAssignments),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [contacts.dataSourceId],
    references: [dataSources.id],
  }),
  business: one(businesses, {
    fields: [contacts.businessId],
    references: [businesses.id],
  }),
  property: one(properties, {
    fields: [contacts.propertyId],
    references: [properties.id],
  }),
  lead: one(leads, { fields: [contacts.leadId], references: [leads.id] }),
}));

export const importJobsRelations = relations(importJobs, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [importJobs.dataSourceId],
    references: [dataSources.id],
  }),
}));

// ============================================================
// DATA LAKE TYPE EXPORTS
// ============================================================

export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type SectorAssignment = typeof sectorAssignments.$inferSelect;
export type NewSectorAssignment = typeof sectorAssignments.$inferInsert;
export type ImportJob = typeof importJobs.$inferSelect;
export type NewImportJob = typeof importJobs.$inferInsert;

// ============================================================
// BILLING & SUBSCRIPTIONS
// ============================================================

/**
 * PLANS - Subscription tiers and pricing
 */
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),

  // === Plan Identity ===
  name: text("name").notNull(), // 'Starter', 'Pro', 'Agency', 'White-Label'
  slug: text("slug").notNull().unique(), // 'starter', 'pro', 'agency', 'white-label'
  description: text("description"),

  // === Pricing ===
  priceMonthly: integer("price_monthly").notNull(), // cents (29700 = $297)
  priceYearly: integer("price_yearly"), // cents (with discount)
  setupFee: integer("setup_fee").default(0), // one-time setup fee

  // === Limits ===
  maxUsers: integer("max_users").default(1),
  maxLeadsPerMonth: integer("max_leads_per_month").default(1000),
  maxPropertySearches: integer("max_property_searches").default(500),
  maxSmsPerMonth: integer("max_sms_per_month").default(500),
  maxSkipTraces: integer("max_skip_traces").default(50),
  maxCampaigns: integer("max_campaigns").default(3),
  maxAiSdrAvatars: integer("max_ai_sdr_avatars").default(1),

  // === Features ===
  features: jsonb("features").default([]), // ['power_dialer', 'email_campaigns', 'api_access', 'priority_support']
  hasPowerDialer: boolean("has_power_dialer").default(false),
  hasEmailCampaigns: boolean("has_email_campaigns").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  hasWhiteLabel: boolean("has_white_label").default(false),

  // === Display ===
  displayOrder: integer("display_order").default(0),
  isPopular: boolean("is_popular").default(false),
  isActive: boolean("is_active").default(true),

  // === Stripe ===
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  stripeProductId: text("stripe_product_id"),

  // === Timestamps ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * SUBSCRIPTIONS - Active customer subscriptions
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // === Links ===
    userId: text("user_id").notNull(), // Team/org owner
    teamId: text("team_id"), // Optional team association
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),

    // === Subscription Info ===
    status: text("status").notNull().default("active"), // 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused'
    billingCycle: text("billing_cycle").notNull().default("monthly"), // 'monthly' | 'yearly'

    // === Dates ===
    startDate: timestamp("start_date").notNull().defaultNow(),
    endDate: timestamp("end_date"), // null = ongoing
    trialEndsAt: timestamp("trial_ends_at"),
    canceledAt: timestamp("canceled_at"),
    currentPeriodStart: timestamp("current_period_start")
      .notNull()
      .defaultNow(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),

    // === Stripe ===
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),

    // === Overrides (for custom deals) ===
    customPricing: integer("custom_pricing"), // Override plan price
    customLimits: jsonb("custom_limits"), // Override specific limits

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    teamIdIdx: index("subscriptions_team_id_idx").on(table.teamId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
    stripeCustomerIdx: index("subscriptions_stripe_customer_idx").on(
      table.stripeCustomerId,
    ),
  }),
);

/**
 * USAGE - Track feature usage per billing period
 */
export const usage = pgTable(
  "usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // === Links ===
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),

    // === Period ===
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // === Counts ===
    leadsCreated: integer("leads_created").default(0),
    propertySearches: integer("property_searches").default(0),
    smsSent: integer("sms_sent").default(0),
    skipTraces: integer("skip_traces").default(0),
    apolloEnrichments: integer("apollo_enrichments").default(0),
    voiceMinutes: integer("voice_minutes").default(0),
    emailsSent: integer("emails_sent").default(0),
    aiGenerations: integer("ai_generations").default(0),

    // === Overages ===
    overageLeads: integer("overage_leads").default(0),
    overageSms: integer("overage_sms").default(0),
    overageSkipTraces: integer("overage_skip_traces").default(0),
    overageVoiceMinutes: integer("overage_voice_minutes").default(0),

    // === Costs ===
    overageCost: integer("overage_cost").default(0), // cents

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    subscriptionIdIdx: index("usage_subscription_id_idx").on(
      table.subscriptionId,
    ),
    userIdIdx: index("usage_user_id_idx").on(table.userId),
    periodIdx: index("usage_period_idx").on(table.periodStart, table.periodEnd),
  }),
);

/**
 * USAGE_EVENTS - Granular usage tracking
 */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // === Links ===
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),

    // === Event ===
    eventType: text("event_type").notNull(), // 'lead_created' | 'sms_sent' | 'skip_trace' | 'property_search' | 'voice_call' | 'ai_generation'
    quantity: integer("quantity").default(1),

    // === Cost ===
    unitCost: integer("unit_cost").default(0), // cents per unit
    totalCost: integer("total_cost").default(0), // cents

    // === Metadata ===
    metadata: jsonb("metadata"), // { leadId, campaignId, etc. }

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    subscriptionIdIdx: index("usage_events_subscription_id_idx").on(
      table.subscriptionId,
    ),
    userIdIdx: index("usage_events_user_id_idx").on(table.userId),
    eventTypeIdx: index("usage_events_event_type_idx").on(table.eventType),
    createdAtIdx: index("usage_events_created_at_idx").on(table.createdAt),
  }),
);

/**
 * INVOICES - Billing invoices
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // === Links ===
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    userId: text("user_id").notNull(),

    // === Invoice Info ===
    invoiceNumber: text("invoice_number").notNull().unique(),
    status: text("status").notNull().default("draft"), // 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

    // === Amounts ===
    subtotal: integer("subtotal").notNull(), // cents
    tax: integer("tax").default(0),
    discount: integer("discount").default(0),
    total: integer("total").notNull(), // cents
    amountPaid: integer("amount_paid").default(0),
    amountDue: integer("amount_due").notNull(),

    // === Period ===
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    dueDate: timestamp("due_date").notNull(),
    paidAt: timestamp("paid_at"),

    // === Line Items ===
    lineItems: jsonb("line_items").default([]), // [{ description, quantity, unitPrice, total }]

    // === Stripe ===
    stripeInvoiceId: text("stripe_invoice_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    invoicePdf: text("invoice_pdf"), // URL to PDF

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    subscriptionIdIdx: index("invoices_subscription_id_idx").on(
      table.subscriptionId,
    ),
    userIdIdx: index("invoices_user_id_idx").on(table.userId),
    statusIdx: index("invoices_status_idx").on(table.status),
    invoiceNumberIdx: index("invoices_invoice_number_idx").on(
      table.invoiceNumber,
    ),
  }),
);

/**
 * PAYMENTS - Payment transactions
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // === Links ===
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    userId: text("user_id").notNull(),

    // === Payment Info ===
    amount: integer("amount").notNull(), // cents
    currency: text("currency").default("usd"),
    status: text("status").notNull(), // 'pending' | 'succeeded' | 'failed' | 'refunded'
    paymentMethod: text("payment_method"), // 'card' | 'bank_transfer' | 'invoice'

    // === Card Details (if applicable) ===
    cardLast4: text("card_last4"),
    cardBrand: text("card_brand"), // 'visa' | 'mastercard' | 'amex'

    // === Stripe ===
    stripePaymentId: text("stripe_payment_id"),
    stripeChargeId: text("stripe_charge_id"),

    // === Refund ===
    refundedAmount: integer("refunded_amount").default(0),
    refundedAt: timestamp("refunded_at"),
    refundReason: text("refund_reason"),

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    invoiceIdIdx: index("payments_invoice_id_idx").on(table.invoiceId),
    subscriptionIdIdx: index("payments_subscription_id_idx").on(
      table.subscriptionId,
    ),
    userIdIdx: index("payments_user_id_idx").on(table.userId),
    statusIdx: index("payments_status_idx").on(table.status),
  }),
);

// ============================================================
// BILLING RELATIONS
// ============================================================

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    plan: one(plans, {
      fields: [subscriptions.planId],
      references: [plans.id],
    }),
    usage: many(usage),
    usageEvents: many(usageEvents),
    invoices: many(invoices),
    payments: many(payments),
  }),
);

export const usageRelations = relations(usage, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [usage.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [usageEvents.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// ============================================================
// BILLING TYPE EXPORTS
// ============================================================

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Usage = typeof usage.$inferSelect;
export type NewUsage = typeof usage.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// ============================================================
// SMS & CALL LOGS - Communication tracking
// ============================================================

/**
 * SMS MESSAGES - Track all SMS communications
 */
export const smsMessages = pgTable(
  "sms_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id"),

    // === Message Info ===
    direction: text("direction").notNull(), // 'inbound' | 'outbound'
    fromNumber: text("from_number").notNull(),
    toNumber: text("to_number").notNull(),
    body: text("body").notNull(),

    // === Status ===
    status: text("status").notNull().default("pending"), // 'pending' | 'sent' | 'delivered' | 'failed' | 'received'
    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    // === Campaign Link ===
    campaignId: text("campaign_id"),
    batchId: text("batch_id"),
    templateId: text("template_id"),

    // === Provider Info ===
    provider: text("provider").default("signalhouse"), // 'signalhouse' | 'twilio'
    providerMessageId: text("provider_message_id"),
    providerStatus: text("provider_status"),

    // === AI Assistant ===
    sentByAdvisor: text("sent_by_advisor"), // 'gianna' | 'sabrina' | null
    aiGenerated: boolean("ai_generated").default(false),

    // === Timestamps ===
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    receivedAt: timestamp("received_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leadIdIdx: index("sms_messages_lead_id_idx").on(table.leadId),
    directionIdx: index("sms_messages_direction_idx").on(table.direction),
    statusIdx: index("sms_messages_status_idx").on(table.status),
    campaignIdIdx: index("sms_messages_campaign_id_idx").on(table.campaignId),
    fromNumberIdx: index("sms_messages_from_number_idx").on(table.fromNumber),
  }),
);

/**
 * CALL LOGS - Track all voice calls
 */
export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id"),

    // === Call Info ===
    direction: text("direction").notNull(), // 'inbound' | 'outbound'
    fromNumber: text("from_number").notNull(),
    toNumber: text("to_number").notNull(),

    // === Status & Duration ===
    status: text("status").notNull().default("initiated"), // 'initiated' | 'ringing' | 'connected' | 'completed' | 'failed' | 'no_answer' | 'busy' | 'voicemail'
    duration: integer("duration"), // seconds
    disposition: text("disposition"), // 'appointment_set' | 'callback_requested' | 'not_interested' | 'wrong_number' | 'no_answer' | 'voicemail' | 'other'
    dispositionNotes: text("disposition_notes"),

    // === Campaign Link ===
    campaignId: text("campaign_id"),
    dialerWorkspaceId: text("dialer_workspace_id"),

    // === Provider Info ===
    provider: text("provider").default("signalhouse"), // 'signalhouse' | 'twilio'
    providerCallId: text("provider_call_id"),
    providerStatus: text("provider_status"),

    // === Recording ===
    recordingUrl: text("recording_url"),
    recordingDuration: integer("recording_duration"),
    transcriptionUrl: text("transcription_url"),
    transcriptionText: text("transcription_text"),

    // === AI Assistant (Gianna Copilot) ===
    isAutoDial: boolean("is_auto_dial").default(false),
    autoDailSessionId: text("auto_dial_session_id"),
    aiSummary: text("ai_summary"),
    sentimentScore: integer("sentiment_score"), // -100 to 100

    // === Timestamps ===
    startTime: timestamp("start_time"),
    answerTime: timestamp("answer_time"),
    endTime: timestamp("end_time"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leadIdIdx: index("call_logs_lead_id_idx").on(table.leadId),
    directionIdx: index("call_logs_direction_idx").on(table.direction),
    statusIdx: index("call_logs_status_idx").on(table.status),
    dispositionIdx: index("call_logs_disposition_idx").on(table.disposition),
    campaignIdIdx: index("call_logs_campaign_id_idx").on(table.campaignId),
  }),
);

/**
 * DIALER SESSIONS - Track auto-dial sessions
 */
export const dialerSessions = pgTable(
  "dialer_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id").notNull(),
    userId: text("user_id").notNull(),

    // === Session Info ===
    status: text("status").notNull().default("created"), // 'created' | 'active' | 'paused' | 'completed' | 'cancelled'
    dialMode: text("dial_mode").default("preview"), // 'preview' | 'power' | 'predictive'

    // === Progress ===
    totalLeads: integer("total_leads").default(0),
    dialedLeads: integer("dialed_leads").default(0),
    connectedCalls: integer("connected_calls").default(0),
    appointmentsSet: integer("appointments_set").default(0),

    // === Advisor ===
    assignedAdvisor: text("assigned_advisor"), // 'gianna' | 'sabrina' | user_id

    // === Campaign Link ===
    campaignId: text("campaign_id"),
    bucketId: uuid("bucket_id").references(() => buckets.id),

    // === Timestamps ===
    startedAt: timestamp("started_at"),
    pausedAt: timestamp("paused_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("dialer_sessions_workspace_id_idx").on(
      table.workspaceId,
    ),
    userIdIdx: index("dialer_sessions_user_id_idx").on(table.userId),
    statusIdx: index("dialer_sessions_status_idx").on(table.status),
  }),
);

// SMS & Call Relations
export const smsMessagesRelations = relations(smsMessages, ({ one }) => ({
  lead: one(leads, { fields: [smsMessages.leadId], references: [leads.id] }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  lead: one(leads, { fields: [callLogs.leadId], references: [leads.id] }),
}));

export const dialerSessionsRelations = relations(dialerSessions, ({ one }) => ({
  bucket: one(buckets, {
    fields: [dialerSessions.bucketId],
    references: [buckets.id],
  }),
}));

/**
 * CAMPAIGN ATTEMPTS - Track all outreach attempts for compliance
 * Required for TCPA compliance, performance metrics, and auto-retarget triggering
 *
 * Tracks:
 * - All campaign contexts (initial, retarget, follow_up, book_appointment, etc.)
 * - Attempt history per lead
 * - Contact status
 * - Template/message used
 * - Response tracking
 *
 * ML LABELING: Every attempt is timestamped and labeled for machine learning:
 * - campaignType: initial | nudger | nurture
 * - attemptNumber: Which attempt this is (1, 2, 3...)
 * - totalAttemptsSinceInception: Cumulative count across all campaigns for this lead
 * - All timestamps in UTC for consistent ML training
 */
export const campaignAttempts = pgTable(
  "campaign_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // === Links ===
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    teamId: text("team_id"),
    userId: text("user_id"),

    // === Campaign Context ===
    campaignContext: text("campaign_context").notNull(), // 'initial' | 'retarget' | 'follow_up' | 'book_appointment' | 'confirm_appointment' | 'nurture' | 'ghost' | 'scheduled' | 'instant'
    campaignId: text("campaign_id"), // Link to campaign
    campaignName: text("campaign_name"),
    // === Campaign Type for ML ===
    campaignType: text("campaign_type").notNull().default("initial"), // 'initial' | 'nudger' | 'nurture'

    // === Attempt Info ===
    attemptNumber: integer("attempt_number").notNull().default(1), // 1, 2, 3...
    previousAttempts: integer("previous_attempts").default(0), // Total attempts before this one
    totalAttemptsSinceInception: integer(
      "total_attempts_since_inception",
    ).default(1), // Total from lead inception
    channel: text("channel").notNull(), // 'sms' | 'dialer' | 'email'

    // === Message ===
    templateUsed: text("template_used"), // Template/opener text used
    templateCategory: text("template_category"), // 'property' | 'business' | 'general' | 'blue_collar' | 'ny_direct'
    agent: text("agent"), // 'gianna' | 'sabrina' | null

    // === Status ===
    status: text("status").notNull().default("queued"), // 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'
    contactMade: boolean("contact_made").default(false), // Did we get a response?

    // === Response Tracking ===
    responseReceived: boolean("response_received").default(false),
    responseText: text("response_text"),
    responseClassification: text("response_classification"), // 'interested' | 'not_interested' | 'question' | 'opt_out' | 'ghost'
    responseReceivedAt: timestamp("response_received_at"),

    // === Auto-Retarget ===
    autoRetargetEligible: boolean("auto_retarget_eligible").default(false),
    retargetScheduledFor: timestamp("retarget_scheduled_for"),
    humanApprovalRequired: boolean("human_approval_required").default(false),
    humanApprovedBy: text("human_approved_by"),
    humanApprovedAt: timestamp("human_approved_at"),

    // === Provider Info ===
    providerMessageId: text("provider_message_id"), // SignalHouse message ID
    providerStatus: text("provider_status"),

    // === Error Tracking ===
    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    // === ML Labels (for training) ===
    mlLabels: jsonb("ml_labels"), // { campaignType, attemptSequence, createdAtUtc, scheduledAtUtc, audienceContext, personaId }

    // === Metadata ===
    metadata: jsonb("metadata"), // Additional context data

    // === Timestamps (all UTC for ML consistency) ===
    scheduledAt: timestamp("scheduled_at"), // When scheduled to send
    sentAt: timestamp("sent_at"), // When actually sent
    deliveredAt: timestamp("delivered_at"), // When confirmed delivered
    lastAttemptedAt: timestamp("last_attempted_at"), // When this specific attempt was made
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leadIdIdx: index("campaign_attempts_lead_id_idx").on(table.leadId),
    teamIdIdx: index("campaign_attempts_team_id_idx").on(table.teamId),
    campaignContextIdx: index("campaign_attempts_context_idx").on(
      table.campaignContext,
    ),
    statusIdx: index("campaign_attempts_status_idx").on(table.status),
    channelIdx: index("campaign_attempts_channel_idx").on(table.channel),
    campaignIdIdx: index("campaign_attempts_campaign_id_idx").on(
      table.campaignId,
    ),
    createdAtIdx: index("campaign_attempts_created_at_idx").on(table.createdAt),
    // === ML Query Indexes ===
    campaignTypeIdx: index("campaign_attempts_type_idx").on(table.campaignType),
    attemptNumberIdx: index("campaign_attempts_attempt_num_idx").on(
      table.attemptNumber,
    ),
    lastAttemptedAtIdx: index("campaign_attempts_last_attempted_idx").on(
      table.lastAttemptedAt,
    ),
    mlCompositeIdx: index("campaign_attempts_ml_idx").on(
      table.campaignType,
      table.attemptNumber,
      table.createdAt,
    ),
  }),
);

// Campaign Attempts Relations
export const campaignAttemptsRelations = relations(
  campaignAttempts,
  ({ one }) => ({
    lead: one(leads, {
      fields: [campaignAttempts.leadId],
      references: [leads.id],
    }),
  }),
);

// Type exports
export type SmsMessage = typeof smsMessages.$inferSelect;
export type NewSmsMessage = typeof smsMessages.$inferInsert;
export type CallLog = typeof callLogs.$inferSelect;
export type NewCallLog = typeof callLogs.$inferInsert;
export type DialerSession = typeof dialerSessions.$inferSelect;
export type NewDialerSession = typeof dialerSessions.$inferInsert;
export type CampaignAttempt = typeof campaignAttempts.$inferSelect;
export type NewCampaignAttempt = typeof campaignAttempts.$inferInsert;

// ============================================================
// DEALS - Deal Pipeline / Machine 5
// ============================================================

/**
 * DEALS - Pipeline deals for closing and monetization
 * Links to leads, properties, and businesses
 */
export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: text("team_id").notNull(),
    userId: text("user_id").notNull(),

    // === Links ===
    leadId: text("lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    businessId: uuid("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),

    // === Deal Type & Stage ===
    type: text("type").notNull(), // 'b2b_exit' | 'commercial' | 'assemblage' | 'blue_collar_exit' | 'development' | 'residential_haos'
    stage: text("stage").notNull().default("discovery"), // 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'contract' | 'closing' | 'closed_won' | 'closed_lost'
    priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'urgent'

    // === Deal Info ===
    name: text("name").notNull(),
    description: text("description"),
    estimatedValue: integer("estimated_value").default(0), // Property/business value in cents
    askingPrice: integer("asking_price"), // Seller's asking price
    finalPrice: integer("final_price"), // Final deal price (when closed)

    // === Monetization ===
    monetization: jsonb("monetization").default({}), // { type, rate, estimatedEarnings, actualEarnings }
    commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // e.g., 6.00 for 6%
    advisoryFee: integer("advisory_fee"), // Flat advisory fee in cents
    referralFee: integer("referral_fee"), // Referral fee in cents
    equityPercentage: decimal("equity_percentage", { precision: 5, scale: 2 }), // Equity stake

    // === Parties ===
    seller: jsonb("seller"), // { name, email, phone, company }
    buyer: jsonb("buyer"), // { name, email, phone, company }
    assignedTo: text("assigned_to"), // User ID of assigned agent

    // === Property Data (denormalized for closed deals) ===
    propertyData: jsonb("property_data"), // Snapshot of property at deal time

    // === Business Data (denormalized for closed deals) ===
    businessData: jsonb("business_data"), // Snapshot of business at deal time

    // === Timeline ===
    expectedCloseDate: timestamp("expected_close_date"),
    actualCloseDate: timestamp("actual_close_date"),
    lastActivityAt: timestamp("last_activity_at"),
    stageChangedAt: timestamp("stage_changed_at"),

    // === Close Info ===
    closedReason: text("closed_reason"), // For closed_lost: 'price' | 'timing' | 'competition' | 'financing' | 'other'
    closedNotes: text("closed_notes"),

    // === Documents ===
    documents: jsonb("documents").default([]), // [{ id, name, type, url, uploadedAt }]

    // === Tags & Notes ===
    tags: jsonb("tags").default([]), // string[]
    notes: text("notes"),

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("deals_team_id_idx").on(table.teamId),
    userIdIdx: index("deals_user_id_idx").on(table.userId),
    leadIdIdx: index("deals_lead_id_idx").on(table.leadId),
    stageIdx: index("deals_stage_idx").on(table.stage),
    typeIdx: index("deals_type_idx").on(table.type),
    assignedToIdx: index("deals_assigned_to_idx").on(table.assignedTo),
  }),
);

/**
 * DEAL_ACTIVITIES - Activity log for deals
 * Tracks all changes, communications, and milestones
 */
export const dealActivities = pgTable(
  "deal_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),

    // === Activity Type ===
    type: text("type").notNull(), // 'stage_change' | 'note' | 'call' | 'email' | 'meeting' | 'document' | 'price_change' | 'assignment'
    subtype: text("subtype"), // More specific action

    // === Content ===
    title: text("title").notNull(),
    description: text("description"),
    metadata: jsonb("metadata"), // Type-specific data { fromStage, toStage, amount, etc }

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    dealIdIdx: index("deal_activities_deal_id_idx").on(table.dealId),
    typeIdx: index("deal_activities_type_idx").on(table.type),
    createdAtIdx: index("deal_activities_created_at_idx").on(table.createdAt),
  }),
);

/**
 * DEAL_DOCUMENTS - Documents attached to deals
 * Contracts, LOIs, appraisals, etc.
 */
export const dealDocuments = pgTable(
  "deal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),

    // === Document Info ===
    name: text("name").notNull(),
    type: text("type").notNull(), // 'contract' | 'loi' | 'appraisal' | 'inspection' | 'title' | 'financials' | 'other'
    mimeType: text("mime_type"),
    fileSize: integer("file_size"), // bytes

    // === Storage ===
    url: text("url").notNull(), // CDN/Storage URL
    storageKey: text("storage_key"), // S3/Spaces key

    // === Status ===
    status: text("status").default("pending"), // 'pending' | 'approved' | 'rejected' | 'signed'
    signedAt: timestamp("signed_at"),
    signedBy: text("signed_by"),

    // === Timestamps ===
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    dealIdIdx: index("deal_documents_deal_id_idx").on(table.dealId),
    typeIdx: index("deal_documents_type_idx").on(table.type),
  }),
);

// ============================================================
// DEALS RELATIONS
// ============================================================

export const dealsRelations = relations(deals, ({ one, many }) => ({
  lead: one(leads, { fields: [deals.leadId], references: [leads.id] }),
  property: one(properties, {
    fields: [deals.propertyId],
    references: [properties.id],
  }),
  business: one(businesses, {
    fields: [deals.businessId],
    references: [businesses.id],
  }),
  activities: many(dealActivities),
  dealDocuments: many(dealDocuments),
}));

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(deals, { fields: [dealActivities.dealId], references: [deals.id] }),
}));

export const dealDocumentsRelations = relations(dealDocuments, ({ one }) => ({
  deal: one(deals, { fields: [dealDocuments.dealId], references: [deals.id] }),
}));

// ============================================================
// DEALS TYPE EXPORTS
// ============================================================

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type DealActivity = typeof dealActivities.$inferSelect;
export type NewDealActivity = typeof dealActivities.$inferInsert;
export type DealDocument = typeof dealDocuments.$inferSelect;
export type NewDealDocument = typeof dealDocuments.$inferInsert;

// ============================================================
// DATA SCHEMAS - Per-team schema definitions for custom fields
// ============================================================

/**
 * DATA_SCHEMAS - Store custom schema definitions per team
 * Supports versioning and rollback
 */
export const dataSchemas = pgTable(
  "data_schemas",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // === Scope ===
    scope: text("scope").notNull().default("team"), // 'global' | 'team'
    teamId: text("team_id"), // null for global schemas

    // === Schema Identity ===
    key: text("key").notNull(), // 'leads' | 'contacts' | 'companies' | 'real-estate' | etc
    name: text("name").notNull(), // Display name
    description: text("description"),

    // === Schema Definition ===
    schemaJson: jsonb("schema_json").notNull().default({}), // { fields: [], settings: {} }

    // === Versioning ===
    version: integer("version").notNull().default(1),
    previousVersionId: uuid("previous_version_id"), // Links to prior version for rollback

    // === Status ===
    isActive: boolean("is_active").default(true),
    isDefault: boolean("is_default").default(false), // Only one default per key

    // === Audit ===
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),

    // === Timestamps ===
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("data_schemas_team_id_idx").on(table.teamId),
    keyIdx: index("data_schemas_key_idx").on(table.key),
    scopeKeyIdx: index("data_schemas_scope_key_idx").on(table.scope, table.key),
    activeIdx: index("data_schemas_active_idx").on(table.isActive),
  }),
);

// Type exports
export type DataSchema = typeof dataSchemas.$inferSelect;
export type NewDataSchema = typeof dataSchemas.$inferInsert;

// ============================================================
// CAMPAIGNS - Marketing/outreach campaigns
// See: apps/api/src/database/schema/campaigns.schema.ts
// ============================================================

export const campaigns = pgTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    sdrId: text("sdr_id"),
    name: text("name").notNull(),
    description: text("description"),
    targetMethod: text("target_method").notNull().default("SCORE_BASED"),
    minScore: integer("min_score").notNull(),
    maxScore: integer("max_score").notNull(),
    location: jsonb("location"),
    status: text("status").notNull().default("DRAFT"),
    estimatedLeadsCount: integer("estimated_leads_count").notNull().default(0),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at"),
    pausedAt: timestamp("paused_at"),
    resumedAt: timestamp("resumed_at"),
    metadata: jsonb("metadata"),
    // === Campaign Type for ML Classification ===
    campaignType: text("campaign_type").notNull().default("initial"), // 'initial' | 'nudger' | 'nurture'
    // === Attempt Tracking from Inception ===
    totalAttempts: integer("total_attempts").notNull().default(0), // Total attempts since campaign inception
    currentAttemptNumber: integer("current_attempt_number")
      .notNull()
      .default(0), // Current attempt sequence
    lastAttemptedAt: timestamp("last_attempted_at"), // When was last attempt made
    lastAttemptStatus: text("last_attempt_status"), // Status of last attempt
    // === ML Labels (timestamped for training) ===
    mlLabels: jsonb("ml_labels"), // { campaignType, attemptSequence, createdAtUtc, audienceContext, personaId }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("campaigns_team_id_idx").on(table.teamId),
    statusIdx: index("campaigns_status_idx").on(table.status),
    campaignTypeIdx: index("campaigns_type_idx").on(table.campaignType),
    lastAttemptedAtIdx: index("campaigns_last_attempted_at_idx").on(
      table.lastAttemptedAt,
    ),
  }),
);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

// ============================================================
// POWER DIALERS - Dialing sessions
// See: apps/api/src/database/schema/power-dialers.schema.ts
// ============================================================

export const powerDialers = pgTable(
  "power_dialers",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    memberId: text("member_id"),
    title: text("title").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("power_dialers_team_id_idx").on(table.teamId),
  }),
);

export type PowerDialer = typeof powerDialers.$inferSelect;
export type NewPowerDialer = typeof powerDialers.$inferInsert;

// ============================================================
// DIALER CONTACTS - Contacts queued in a power dialer session
// ============================================================

export const dialerContacts = pgTable(
  "dialer_contacts",
  {
    id: text("id").primaryKey(),
    powerDialerId: text("power_dialer_id").notNull(),
    leadId: text("lead_id"),
    position: integer("position").notNull(),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    powerDialerIdIdx: index("dialer_contacts_power_dialer_id_idx").on(
      table.powerDialerId,
    ),
    statusIdx: index("dialer_contacts_status_idx").on(table.status),
  }),
);

export type DialerContact = typeof dialerContacts.$inferSelect;
export type NewDialerContact = typeof dialerContacts.$inferInsert;

// ============================================================
// CALL HISTORIES - Records of calls made
// ============================================================

export const callHistories = pgTable(
  "call_histories",
  {
    id: text("id").primaryKey(),
    dialerContactId: text("dialer_contact_id").notNull(),
    powerDialerId: text("power_dialer_id").notNull(),
    sid: text("sid"),
    dialerMode: text("dialer_mode").notNull(),
    teamMemberId: text("team_member_id"),
    aiSdrAvatarId: text("ai_sdr_avatar_id"),
    duration: integer("duration").notNull().default(0),
    disposition: text("disposition"),
    notes: text("notes"),
    sentiment: jsonb("sentiment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    powerDialerIdIdx: index("call_histories_power_dialer_id_idx").on(
      table.powerDialerId,
    ),
    dialerContactIdIdx: index("call_histories_dialer_contact_id_idx").on(
      table.dialerContactId,
    ),
  }),
);

export type CallHistory = typeof callHistories.$inferSelect;
export type NewCallHistory = typeof callHistories.$inferInsert;

// ============================================================
// CALL RECORDINGS - Voice recording metadata
// See: apps/api/src/database/schema/power-dialers.schema.ts
// ============================================================

export const callRecordings = pgTable(
  "call_recordings",
  {
    id: text("id").primaryKey(),
    callHistoryId: text("call_history_id").notNull(),
    recordingSid: text("recording_sid"),
    recordingUrl: text("recording_url"),
    status: text("status").notNull().default("UNKNOWN"),
    duration: integer("duration"),
    transcription: text("transcription"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    callHistoryIdIdx: index("call_recordings_call_history_id_idx").on(
      table.callHistoryId,
    ),
  }),
);

export type CallRecording = typeof callRecordings.$inferSelect;
export type NewCallRecording = typeof callRecordings.$inferInsert;

// ============================================================
// MESSAGE TEMPLATES - Reusable message templates
// See: apps/api/src/database/schema/message-templates.schema.ts
// ============================================================

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("message_templates_team_id_idx").on(table.teamId),
    typeIdx: index("message_templates_type_idx").on(table.type),
  }),
);

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type NewMessageTemplate = typeof messageTemplates.$inferInsert;

// ============================================================
// SIGNALHOUSE 10DLC BRAND REGISTRATION
// Tracks brand registration status with SignalHouse/TCR for 10DLC compliance
// See: apps/api/src/database/schema/signalhouse.schema.ts for source of truth
// ============================================================

export const signalhouseBrands = pgTable(
  "signalhouse_brands",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),

    // SignalHouse identifiers
    brandId: text("brand_id").notNull(),
    cspId: text("csp_id"),

    // Brand details
    displayName: text("display_name").notNull(),
    companyName: text("company_name").notNull(),
    ein: text("ein"),
    einIssuingCountry: text("ein_issuing_country").default("US"),
    entityType: text("entity_type").notNull().default("PRIVATE_PROFIT"),
    vertical: text("vertical").notNull().default("PROFESSIONAL"),

    // Contact info
    email: text("email"),
    phone: text("phone"),
    street: text("street"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("US"),
    website: text("website"),

    // Registration status
    registrationStatus: text("registration_status")
      .notNull()
      .default("PENDING"),
    tcrBrandId: text("tcr_brand_id"),
    tcrScore: integer("tcr_score"),
    vettingStatus: text("vetting_status").default("PENDING"),

    // Metadata
    rejectionReason: text("rejection_reason"),
    metadata: jsonb("metadata"),

    // Timestamps
    submittedAt: timestamp("submitted_at"),
    approvedAt: timestamp("approved_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("signalhouse_brands_team_id_idx").on(table.teamId),
    brandIdIdx: index("signalhouse_brands_brand_id_idx").on(table.brandId),
    statusIdx: index("signalhouse_brands_status_idx").on(
      table.registrationStatus,
    ),
  }),
);

export type SignalhouseBrand = typeof signalhouseBrands.$inferSelect;
export type NewSignalhouseBrand = typeof signalhouseBrands.$inferInsert;

// ============================================================
// SIGNALHOUSE 10DLC CAMPAIGN REGISTRATION
// Tracks campaign (use case) registration with SignalHouse/TCR
// ============================================================

export const signalhouseCampaigns = pgTable(
  "signalhouse_campaigns",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    brandId: text("brand_id").notNull(),

    // SignalHouse identifiers
    campaignId: text("campaign_id").notNull(),
    tcrCampaignId: text("tcr_campaign_id"),

    // Campaign details
    useCase: text("use_case").notNull().default("MIXED"),
    subUseCases: jsonb("sub_use_cases").$type<string[]>().default([]),
    description: text("description").notNull(),
    sampleMessages: jsonb("sample_messages").$type<string[]>().default([]),

    // Message flow settings
    subscriberOptIn: boolean("subscriber_opt_in").notNull().default(true),
    subscriberOptOut: boolean("subscriber_opt_out").notNull().default(true),
    subscriberHelp: boolean("subscriber_help").notNull().default(true),
    embeddedLink: boolean("embedded_link").notNull().default(false),
    embeddedPhone: boolean("embedded_phone").notNull().default(false),
    numberPool: boolean("number_pool").notNull().default(false),

    // Throughput limits
    messageClassification: text("message_classification").default("STANDARD"),
    dailyLimit: integer("daily_limit"),
    monthlyLimit: integer("monthly_limit"),

    // Registration status
    registrationStatus: text("registration_status")
      .notNull()
      .default("PENDING"),
    rejectionReason: text("rejection_reason"),

    // Link to internal campaign
    internalCampaignId: text("internal_campaign_id"),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    submittedAt: timestamp("submitted_at"),
    approvedAt: timestamp("approved_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("signalhouse_campaigns_team_id_idx").on(table.teamId),
    brandIdIdx: index("signalhouse_campaigns_brand_id_idx").on(table.brandId),
    campaignIdIdx: index("signalhouse_campaigns_campaign_id_idx").on(
      table.campaignId,
    ),
    statusIdx: index("signalhouse_campaigns_status_idx").on(
      table.registrationStatus,
    ),
  }),
);

export type SignalhouseCampaign = typeof signalhouseCampaigns.$inferSelect;
export type NewSignalhouseCampaign = typeof signalhouseCampaigns.$inferInsert;

// ============================================================
// TEAM PHONE NUMBERS
// Phone numbers provisioned from SignalHouse for each team
// ============================================================

export const teamPhoneNumbers = pgTable(
  "team_phone_numbers",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),

    // Phone number details
    phoneNumber: text("phone_number").notNull(),
    formattedNumber: text("formatted_number"),
    areaCode: text("area_code"),

    // SignalHouse identifiers
    signalhouseId: text("signalhouse_id"),
    orderId: text("order_id"),

    // Number type and capabilities
    numberType: text("number_type").notNull().default("local"),
    capabilities: jsonb("capabilities")
      .$type<{ sms: boolean; mms: boolean; voice: boolean; fax: boolean }>()
      .default({ sms: true, mms: false, voice: false, fax: false }),

    // 10DLC association
    brandId: text("brand_id"),
    campaignId: text("campaign_id"),
    tenDlcStatus: text("ten_dlc_status").default("PENDING"),

    // Status and assignment
    status: text("status").notNull().default("active"),
    assignedTo: text("assigned_to"),
    isPrimary: boolean("is_primary").default(false),
    isDefault: boolean("is_default").default(false),

    // Usage tracking
    smsCount: integer("sms_count").default(0),
    mmsCount: integer("mms_count").default(0),
    voiceMinutes: integer("voice_minutes").default(0),
    lastUsedAt: timestamp("last_used_at"),

    // Billing
    monthlyCost: decimal("monthly_cost", { precision: 10, scale: 4 }),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    provisionedAt: timestamp("provisioned_at"),
    releasedAt: timestamp("released_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("team_phone_numbers_team_id_idx").on(table.teamId),
    phoneNumberIdx: index("team_phone_numbers_phone_number_idx").on(
      table.phoneNumber,
    ),
    statusIdx: index("team_phone_numbers_status_idx").on(table.status),
    signalhouseIdIdx: index("team_phone_numbers_signalhouse_id_idx").on(
      table.signalhouseId,
    ),
  }),
);

export type TeamPhoneNumber = typeof teamPhoneNumbers.$inferSelect;
export type NewTeamPhoneNumber = typeof teamPhoneNumbers.$inferInsert;

// ============================================================
// USERS - Core user accounts
// ============================================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  role: text("role").notNull().default("USER"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================================
// TEAMS - Multi-tenant companies/organizations
// ============================================================

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdIdx: index("teams_owner_id_idx").on(table.ownerId),
  }),
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

// ============================================================
// TEAM MEMBERS - User-Team relationships
// ============================================================

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    userId: text("user_id"),
    role: text("role").notNull().default("MEMBER"),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("team_members_team_id_idx").on(table.teamId),
    userIdIdx: index("team_members_user_id_idx").on(table.userId),
  }),
);

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

// ============================================================
// TEAM SETTINGS - Per-team configuration
// ============================================================

export const teamSettings = pgTable(
  "team_settings",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    name: text("name").notNull(),
    value: text("value"),
    maskedValue: text("masked_value"),
    isMasked: boolean("is_masked").default(false),
    type: text("type").default("string"),
    scope: text("scope"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("team_settings_team_id_idx").on(table.teamId),
    nameIdx: index("team_settings_name_idx").on(table.name),
  }),
);

export type TeamSetting = typeof teamSettings.$inferSelect;
export type NewTeamSetting = typeof teamSettings.$inferInsert;

// ============================================================
// ADMIN AUDIT LOG - Track admin actions for security & compliance
// ============================================================

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Who performed the action
    adminId: text("admin_id").notNull(),
    adminEmail: text("admin_email").notNull(),
    // What action was performed
    action: text("action").notNull(), // 'company.create' | 'company.update' | 'company.delete' | 'user.add_to_team' | 'user.remove_from_team' | 'user.change_role' | 'user.promote_super_admin' | 'impersonate.start' | 'impersonate.end'
    category: text("category").notNull(), // 'company' | 'user' | 'impersonate' | 'settings' | 'data'
    // Target of the action
    targetType: text("target_type"), // 'team' | 'user' | 'teamMember'
    targetId: text("target_id"),
    targetName: text("target_name"),
    // Additional context
    details: jsonb("details"), // Flexible JSON for additional data
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    adminIdIdx: index("admin_audit_logs_admin_id_idx").on(table.adminId),
    actionIdx: index("admin_audit_logs_action_idx").on(table.action),
    categoryIdx: index("admin_audit_logs_category_idx").on(table.category),
    targetIdIdx: index("admin_audit_logs_target_id_idx").on(table.targetId),
    createdAtIdx: index("admin_audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;

// ============================================================
// WORKFLOWS - Team workflow definitions
// See: apps/api/src/database/schema/workflows.schema.ts for full schema
// ============================================================

export const teamWorkflows = pgTable(
  "team_workflows",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    stage: text("stage"), // initial_message, retarget, nudger, content_nurture, book_appt
    trigger: text("trigger"), // lead_created, sms_received, inactivity_threshold, scheduled, etc.
    status: text("status").notNull().default("draft"), // draft, active, archived
    priority: integer("priority").default(1),
    // Configuration
    config: jsonb("config").$type<{
      agent?: string; // GIANNA, CATHY, SABRINA
      templateIds?: string[];
      delayDays?: number;
      usesDifferentNumber?: boolean;
      campaignType?: string;
    }>(),
    // Stats
    runsCount: integer("runs_count").default(0),
    lastRunAt: timestamp("last_run_at"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("team_workflows_team_id_idx").on(table.teamId),
    stageIdx: index("team_workflows_stage_idx").on(table.stage),
    statusIdx: index("team_workflows_status_idx").on(table.status),
  }),
);

export type TeamWorkflow = typeof teamWorkflows.$inferSelect;
export type NewTeamWorkflow = typeof teamWorkflows.$inferInsert;

// ============================================================
// WORKFLOW STAGE CONFIGS - Customizable stage configurations per team
// ============================================================

export const workflowStageConfigs = pgTable(
  "workflow_stage_configs",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    // Agent configuration
    defaultAgent: text("default_agent"), // GIANNA, CATHY, SABRINA, null
    triggerMode: text("trigger_mode").notNull().default("manual"), // automatic, manual, scheduled
    delayDays: integer("delay_days"),
    campaignType: text("campaign_type"),
    usesDifferentNumber: boolean("uses_different_number").default(false),
    // Visual
    icon: text("icon"),
    color: text("color"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("workflow_stage_configs_team_id_idx").on(table.teamId),
    orderIdx: index("workflow_stage_configs_order_idx").on(table.order),
  }),
);

export type WorkflowStageConfig = typeof workflowStageConfigs.$inferSelect;
export type NewWorkflowStageConfig = typeof workflowStageConfigs.$inferInsert;

// ============================================================
// WORKFLOW RUNS - Execution history
// ============================================================

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id").notNull(),
    teamId: text("team_id").notNull(),
    status: text("status").notNull().default("pending"), // pending, running, completed, failed
    // Execution details
    leadsProcessed: integer("leads_processed").default(0),
    leadsSuccessful: integer("leads_successful").default(0),
    leadsFailed: integer("leads_failed").default(0),
    // Input/Output
    inputData: jsonb("input_data"),
    outputData: jsonb("output_data"),
    errorMessage: text("error_message"),
    // Timestamps
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    workflowIdIdx: index("workflow_runs_workflow_id_idx").on(table.workflowId),
    teamIdIdx: index("workflow_runs_team_id_idx").on(table.teamId),
    statusIdx: index("workflow_runs_status_idx").on(table.status),
  }),
);

export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type NewWorkflowRun = typeof workflowRuns.$inferInsert;

// ============================================================
// TEMPLATE LIBRARY - Extended templates for outreach campaigns
// ============================================================

export const templateLibrary = pgTable(
  "template_library",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").notNull(),
    // Template details
    name: text("name").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull(), // carrier_initial, carrier_nudge, dealership_initial, etc.
    stage: text("stage"), // initial, nudge, appointment, retarget
    agent: text("agent"), // GIANNA, CATHY, SABRINA
    // Merge fields
    mergeFields: jsonb("merge_fields").$type<string[]>().default([]),
    // Performance tracking
    sendCount: integer("send_count").default(0),
    responseCount: integer("response_count").default(0),
    conversionCount: integer("conversion_count").default(0),
    // Status
    status: text("status").notNull().default("active"), // active, draft, archived
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("template_library_team_id_idx").on(table.teamId),
    categoryIdx: index("template_library_category_idx").on(table.category),
    stageIdx: index("template_library_stage_idx").on(table.stage),
    statusIdx: index("template_library_status_idx").on(table.status),
  }),
);

export type TemplateLibraryItem = typeof templateLibrary.$inferSelect;
export type NewTemplateLibraryItem = typeof templateLibrary.$inferInsert;
