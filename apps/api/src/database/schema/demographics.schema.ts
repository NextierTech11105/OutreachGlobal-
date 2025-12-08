/**
 * Demographics Schema
 * Demographic data linked to personas
 */
import {
  index,
  integer,
  pgTable,
  real,
  text,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { personasRef } from "./persona.schema";

export const PERSONA_DEMOGRAPHICS_PK = "pdemo";

export const personaDemographics = pgTable(
  "persona_demographics",
  {
    id: primaryUlid(PERSONA_DEMOGRAPHICS_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    // Education
    education: varchar(),
    educationLevel: varchar(), // 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate' | 'unknown'
    // Employment
    occupation: varchar(),
    occupationCategory: varchar(),
    employer: varchar(),
    employerIndustry: varchar(),
    jobTitle: varchar(),
    // Income & Wealth
    incomeRange: varchar(),
    incomeEstimate: integer(),
    netWorthRange: varchar(),
    netWorthEstimate: integer(),
    // Household
    maritalStatus: varchar(), // 'single' | 'married' | 'divorced' | 'widowed' | 'unknown'
    householdSize: integer(),
    hasChildren: boolean(),
    numberOfChildren: integer(),
    // Housing
    homeOwnerStatus: varchar(), // 'owner' | 'renter' | 'unknown'
    lengthOfResidence: integer(), // years
    homeValue: integer(),
    // Interests & Lifestyle
    interests: text().array(),
    politicalAffiliation: varchar(),
    religion: varchar(),
    ethnicity: varchar(),
    // Credit indicators
    creditRange: varchar(),
    // Source
    source: varchar().notNull(), // 'skiptrace' | 'apollo' | 'manual'
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.homeOwnerStatus),
    index().on(t.incomeRange),
  ]
);

export const personaDemographicsRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => personaDemographics.id, config);
