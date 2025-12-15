/**
 * Business Owner Schema
 * Links personas to businesses they're associated with
 */
import {
  index,
  integer,
  pgTable,
  real,
  timestamp,
  varchar,
  boolean,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { personasRef } from "./persona.schema";

export const BUSINESS_OWNER_PK = "bowner";
export const BUSINESS_PK = "biz";

// Business table for B2B sector data
export const businesses = pgTable(
  "businesses",
  {
    id: primaryUlid(BUSINESS_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    // Core identity
    name: varchar().notNull(),
    normalizedName: varchar().notNull(),
    legalName: varchar(),
    dba: varchar(),
    // Classification
    sicCode: varchar(),
    sicDescription: varchar(),
    naicsCode: varchar(),
    naicsDescription: varchar(),
    sector: varchar(),
    subSector: varchar(),
    // Contact
    phone: varchar(),
    email: varchar(),
    website: varchar(),
    // Location
    street: varchar(),
    street2: varchar(),
    city: varchar(),
    state: varchar(),
    zip: varchar(),
    county: varchar(),
    latitude: real(),
    longitude: real(),
    // Metrics
    employeeCount: integer(),
    employeeRange: varchar(),
    annualRevenue: integer(),
    revenueRange: varchar(),
    yearFounded: integer(),
    yearsInBusiness: integer(),
    // Status
    isActive: boolean().notNull().default(true),
    entityType: varchar(), // 'llc' | 'corp' | 'partnership' | 'sole_prop'
    stateOfIncorporation: varchar(),
    // Source tracking
    sourceFile: varchar(), // Original CSV file path
    sourceRecordId: varchar(), // ID from source data
    // Enrichment status
    apolloEnriched: boolean().notNull().default(false),
    apolloEnrichedAt: timestamp(),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.normalizedName),
    index().on(t.sicCode),
    index().on(t.sector),
    index().on(t.state),
    index().on(t.zip),
  ],
);

export const businessesRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => businesses.id, config);

// Business-Persona link table
export const businessOwners = pgTable(
  "business_owners",
  {
    id: primaryUlid(BUSINESS_OWNER_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    businessId: businessesRef({ onDelete: "cascade" }).notNull(),
    // Role
    title: varchar(),
    roleType: varchar().notNull().default("unknown"), // 'owner' | 'ceo' | 'partner' | 'investor' | 'sales_manager' | 'executive' | 'manager' | 'professional' | 'unknown'
    roleConfidence: real().notNull().default(0.5),
    // Flags
    isDecisionMaker: boolean().notNull().default(false),
    isOwner: boolean().notNull().default(false),
    isCLevel: boolean().notNull().default(false),
    isPartner: boolean().notNull().default(false),
    isInvestor: boolean().notNull().default(false),
    isSalesLead: boolean().notNull().default(false),
    // Department
    department: varchar(),
    seniorityLevel: varchar(), // 'entry' | 'mid' | 'senior' | 'executive' | 'c_level'
    // Employment
    startDate: timestamp(),
    endDate: timestamp(),
    isCurrent: boolean().notNull().default(true),
    // Contact preference
    preferredChannel: varchar(), // 'phone' | 'email' | 'linkedin'
    // Source
    source: varchar().notNull(), // 'b2b_upload' | 'apollo' | 'manual'
    matchConfidence: real().notNull().default(1.0),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.businessId),
    uniqueIndex().on(t.personaId, t.businessId),
    index().on(t.roleType),
    index().on(t.isDecisionMaker),
    index().on(t.isCurrent),
  ],
);

export const businessOwnersRef = (config?: {
  onDelete?: "cascade" | "set null";
}) => ulidColumn().references(() => businessOwners.id, config);
