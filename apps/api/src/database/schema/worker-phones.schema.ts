/**
 * Worker Phone Assignments Schema
 * Maps AI Digital Workers (GIANNA, CATHY, SABRINA) to SignalHouse phone numbers
 */
import {
  index,
  pgTable,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

export const WORKER_PHONE_PK = "wphone";

// Valid worker IDs
export type WorkerId = "gianna" | "cathy" | "sabrina" | "neva" | "luci";

export const workerPhoneAssignments = pgTable(
  "worker_phone_assignments",
  {
    id: primaryUlid(WORKER_PHONE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Worker identification
    workerId: varchar().notNull(), // 'gianna' | 'cathy' | 'sabrina' | 'neva' | 'luci'
    workerName: varchar().notNull(), // Display name

    // Phone assignment
    phoneNumber: varchar().notNull(), // E.164 format: +1XXXXXXXXXX
    signalhouseSubgroupId: varchar(), // SignalHouse sub-group for routing

    // Status
    isActive: boolean().notNull().default(true),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.workerId),
    index().on(t.phoneNumber),
    // One phone per worker per team
    uniqueIndex().on(t.teamId, t.workerId),
  ],
);

// Worker display names
export const WORKER_NAMES: Record<WorkerId, string> = {
  gianna: "GIANNA (Opener)",
  cathy: "CATHY (Nudger)",
  sabrina: "SABRINA (Closer)",
  neva: "NEVA (Researcher)",
  luci: "LUCI (Copilot)",
};

// Worker descriptions
export const WORKER_DESCRIPTIONS: Record<WorkerId, string> = {
  gianna: "Initial outreach, email capture, content permission",
  cathy: "Humor-based nudges, ghost revival, re-engagement",
  sabrina: "Objection handling, appointment booking, closing",
  neva: "Property/business research, pre-call briefings",
  luci: "Data copilot, campaign generation, analytics",
};
