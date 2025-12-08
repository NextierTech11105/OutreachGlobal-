/**
 * Email Schema
 * Email addresses linked to personas
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

export const PERSONA_EMAIL_PK = "pemail";

export const personaEmails = pgTable(
  "persona_emails",
  {
    id: primaryUlid(PERSONA_EMAIL_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    // Email data
    emailAddress: varchar().notNull(),
    normalizedAddress: varchar().notNull(), // Lowercase, trimmed
    emailType: varchar().notNull().default("unknown"), // 'personal' | 'business' | 'unknown'
    domain: varchar(),
    // Validation
    isValid: boolean().notNull().default(true),
    isDeliverable: boolean(),
    isDisposable: boolean().notNull().default(false),
    isCatchAll: boolean(),
    // Opt-out
    isUnsubscribed: boolean().notNull().default(false),
    unsubscribedAt: timestamp(),
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
    index().on(t.normalizedAddress),
    uniqueIndex().on(t.personaId, t.normalizedAddress),
    index().on(t.emailType),
    index().on(t.isUnsubscribed),
    index().on(t.domain),
  ]
);

export const personaEmailsRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => personaEmails.id, config);
