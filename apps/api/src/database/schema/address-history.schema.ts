/**
 * Address History Schema
 * Address history linked to personas
 */
import {
  index,
  integer,
  pgTable,
  real,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { personasRef } from "./persona.schema";

export const PERSONA_ADDRESS_PK = "paddr";

export const personaAddresses = pgTable(
  "persona_addresses",
  {
    id: primaryUlid(PERSONA_ADDRESS_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    // Address data
    street: varchar().notNull(),
    street2: varchar(),
    city: varchar().notNull(),
    state: varchar().notNull(), // 2-letter code
    zip: varchar().notNull(), // 5-digit
    zip4: varchar(), // 4-digit extension
    county: varchar(),
    country: varchar().notNull().default("US"),
    // Classification
    addressType: varchar().notNull().default("unknown"), // 'residential' | 'commercial' | 'mailing' | 'po_box' | 'unknown'
    // Status
    isCurrent: boolean().notNull().default(true),
    isPrimary: boolean().notNull().default(false),
    // History
    moveInDate: timestamp(),
    moveOutDate: timestamp(),
    yearsAtAddress: integer(),
    // Geocoding
    latitude: real(),
    longitude: real(),
    // Source
    source: varchar().notNull(), // 'property' | 'skiptrace' | 'business' | 'manual'
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.zip),
    index().on(t.state),
    index().on(t.isCurrent),
    index().on(t.addressType),
  ]
);

export const personaAddressesRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => personaAddresses.id, config);
