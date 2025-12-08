/**
 * Social Schema
 * Social media profiles linked to personas
 */
import {
  index,
  pgTable,
  timestamp,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { personasRef } from "./persona.schema";

export const PERSONA_SOCIAL_PK = "psocial";

export const personaSocials = pgTable(
  "persona_socials",
  {
    id: primaryUlid(PERSONA_SOCIAL_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    personaId: personasRef({ onDelete: "cascade" }).notNull(),
    // Social data
    platform: varchar().notNull(), // 'linkedin' | 'facebook' | 'twitter' | 'instagram' | 'other'
    profileUrl: varchar().notNull(),
    username: varchar(),
    displayName: varchar(),
    // Metadata
    headline: varchar(),
    bio: varchar(),
    followerCount: varchar(),
    connectionCount: varchar(),
    // Verification
    isVerified: boolean().notNull().default(false),
    lastActiveDate: timestamp(),
    // Source
    source: varchar().notNull(), // 'skiptrace' | 'apollo' | 'manual'
    // Timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.personaId),
    index().on(t.platform),
    uniqueIndex().on(t.personaId, t.platform, t.profileUrl),
  ]
);

export const personaSocialsRef = (config?: { onDelete?: "cascade" | "set null" }) =>
  ulidColumn().references(() => personaSocials.id, config);
