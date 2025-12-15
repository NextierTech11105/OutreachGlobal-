/**
 * Persona Identity Schema
 * Core identity table for merging contacts across sources
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

export const PERSONA_PK = "persona";

export const personas = pgTable(
  "personas",
  {
    id: primaryUlid(PERSONA_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    // Core identity
    firstName: varchar().notNull(),
    lastName: varchar().notNull(),
    middleName: varchar(),
    suffix: varchar(),
    fullName: varchar().notNull(),
    // Normalized for matching
    normalizedFirstName: varchar().notNull(),
    normalizedLastName: varchar().notNull(),
    // Demographics
    age: integer(),
    dateOfBirth: varchar(),
    gender: varchar(), // 'male' | 'female' | 'unknown'
    // Matching metadata
    confidenceScore: real().notNull().default(1.0),
    mergedFromIds: text().array().default([]),
    // Source tracking
    primarySource: varchar().notNull(), // 'business' | 'property' | 'consumer' | 'skiptrace' | 'apollo'
    // Enrichment status
    skipTraceCompleted: boolean().notNull().default(false),
    skipTraceCompletedAt: timestamp(),
    apolloCompleted: boolean().notNull().default(false),
    apolloCompletedAt: timestamp(),
    lastEnrichedAt: timestamp(),
    // Status
    isActive: boolean().notNull().default(true),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.normalizedFirstName, t.normalizedLastName),
    index().on(t.primarySource),
    index().on(t.skipTraceCompleted),
    index().on(t.apolloCompleted),
  ],
);

export const personasRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => personas.id, config);

// Persona merge history for tracking identity consolidation
export const personaMergeHistory = pgTable(
  "persona_merge_history",
  {
    id: primaryUlid("pmh"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    survivorId: personasRef({ onDelete: "cascade" }).notNull(),
    mergedId: varchar().notNull(), // ID of the merged persona (may no longer exist)
    matchScore: real().notNull(),
    matchDetails: jsonb().$type<Record<string, unknown>>(),
    mergedBy: varchar(), // 'auto' | 'manual' | user ID
    createdAt,
  },
  (t) => [index().on(t.teamId), index().on(t.survivorId)],
);
