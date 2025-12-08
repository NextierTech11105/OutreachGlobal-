/**
 * Phone Schema
 * Phone numbers linked to personas
 */
import {
  index,
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
import { personas, personasRef } from "./persona.schema";

export const PERSONA_PHONE_PK = "pphone";

export const personaPhones = pgTable(
  "persona_phones",
  {
    id: primaryUlid(PERSONA_PHONE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    // Phone data
    phoneNumber: varchar().notNull(),
    normalizedNumber: varchar().notNull(), // 10-digit normalized
    phoneType: varchar().notNull().default("unknown"), // 'mobile' | 'landline' | 'voip' | 'unknown'
    carrier: varchar(),
    lineType: varchar(),
    // Validation
    isValid: boolean().notNull().default(true),
    isConnected: boolean(),
    isDoNotCall: boolean().notNull().default(false),
    // Priority
    isPrimary: boolean().notNull().default(false),
    // Source & scoring
    source: varchar().notNull(), // 'business' | 'property' | 'skiptrace' | 'apollo' | 'manual'
    score: real().notNull().default(0.5),
    // Verification
    lastVerifiedAt: timestamp(),
    verificationSource: varchar(),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.normalizedNumber),
    uniqueIndex().on(t.personaId, t.normalizedNumber),
    index().on(t.phoneType),
    index().on(t.isDoNotCall),
  ]
);

export const personaPhonesRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => personaPhones.id, config);
