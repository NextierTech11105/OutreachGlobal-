/**
 * Property Owner Schema
 * Links personas to properties they own
 */
import {
  index,
  integer,
  pgTable,
  real,
  timestamp,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { personasRef } from "./persona.schema";
import { properties } from "./properties.schema";

export const PROPERTY_OWNER_PK = "powner";

export const propertyOwners = pgTable(
  "property_owners",
  {
    id: primaryUlid(PROPERTY_OWNER_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    propertyId: ulidColumn()
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    // Ownership details
    ownershipType: varchar().notNull().default("individual"), // 'individual' | 'corporate' | 'trust' | 'estate' | 'joint'
    ownershipPercent: real(),
    isPrimaryOwner: boolean().notNull().default(true),
    // Owner sequence (for multiple owners)
    ownerNumber: integer().notNull().default(1), // 1 = primary, 2 = secondary, etc.
    // Relationship
    relationToProperty: varchar(), // 'owner' | 'trustee' | 'beneficiary' | 'executor'
    // Mailing
    mailingAddressSameAsProperty: boolean().notNull().default(true),
    mailingStreet: varchar(),
    mailingCity: varchar(),
    mailingState: varchar(),
    mailingZip: varchar(),
    // Acquisition
    acquisitionDate: timestamp(),
    acquisitionPrice: integer(),
    acquisitionType: varchar(), // 'purchase' | 'inheritance' | 'gift' | 'transfer'
    // Status
    isCurrentOwner: boolean().notNull().default(true),
    soldDate: timestamp(),
    soldPrice: integer(),
    // Source
    source: varchar().notNull(), // 'property_data' | 'skiptrace' | 'manual'
    matchConfidence: real().notNull().default(1.0),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.propertyId),
    uniqueIndex().on(t.personaId, t.propertyId),
    index().on(t.isCurrentOwner),
    index().on(t.ownershipType),
  ],
);

export const propertyOwnersRef = (config?: {
  onDelete?: "cascade" | "set null";
}) => ulidColumn().references(() => propertyOwners.id, config);
