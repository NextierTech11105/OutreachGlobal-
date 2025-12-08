/**
 * SkipTrace Result Schema
 * Stores raw SkipTrace API responses for auditing
 */
import {
  index,
  jsonb,
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

export const SKIPTRACE_RESULT_PK = "strace";

export const skiptraceResults = pgTable(
  "skiptrace_results",
  {
    id: primaryUlid(SKIPTRACE_RESULT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }),
    // Request info
    requestId: varchar(), // External request ID from API
    sourceType: varchar().notNull(), // 'business' | 'property' | 'consumer'
    sourceId: varchar().notNull(), // ID of the source record
    // Request inputs
    inputFirstName: varchar(),
    inputLastName: varchar(),
    inputAddress: varchar(),
    inputCity: varchar(),
    inputState: varchar(),
    inputZip: varchar(),
    inputEmail: varchar(),
    inputPhone: varchar(),
    // Result status
    success: boolean().notNull().default(false),
    errorCode: varchar(),
    errorMessage: varchar(),
    matchConfidence: real(),
    // Raw response
    rawResponse: jsonb().$type<Record<string, unknown>>(),
    // Processed data counts
    phonesFound: varchar(),
    emailsFound: varchar(),
    addressesFound: varchar(),
    socialsFound: varchar(),
    relativesFound: varchar(),
    // Processing
    processedAt: timestamp(),
    // Provider
    provider: varchar().notNull().default("realestateapi"),
    // Cost tracking
    creditsCost: real(),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.sourceType, t.sourceId),
    index().on(t.success),
    index().on(t.createdAt),
  ]
);

export const skiptraceResultsRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => skiptraceResults.id, config);

// SkipTrace job tracking for bulk operations
export const skiptraceJobs = pgTable(
  "skiptrace_jobs",
  {
    id: primaryUlid("sjob"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    // Job info
    jobId: varchar(), // External bulk job ID
    status: varchar().notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
    // Counts
    totalRequests: varchar(),
    completedRequests: varchar(),
    failedRequests: varchar(),
    // Timing
    startedAt: timestamp(),
    completedAt: timestamp(),
    estimatedCompletionTime: timestamp(),
    // Error
    errorMessage: varchar(),
    // Provider
    provider: varchar().notNull().default("realestateapi"),
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.status),
    index().on(t.jobId),
  ]
);
