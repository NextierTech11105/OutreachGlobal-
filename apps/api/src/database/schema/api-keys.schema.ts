import {
  index,
  pgTable,
  timestamp,
  varchar,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams, teamsRef } from "./teams.schema";
import { users } from "./users.schema";

export const API_KEY_PK = "ak";

/**
 * API Key Types - Different access levels
 */
export const ApiKeyType = {
  USER: "USER", // Basic user access
  ADMIN: "ADMIN", // Team admin access
  DEV: "DEV", // Developer/API access
  OWNER: "OWNER", // Full owner access
  WHITE_LABEL: "WHITE_LABEL", // Partner/white-label access
} as const;

export type ApiKeyType = (typeof ApiKeyType)[keyof typeof ApiKeyType];

/**
 * API Keys Table
 *
 * Stores API keys for authentication instead of (or in addition to) JWT login.
 * Each key is associated with a team and optionally a user.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: primaryUlid(API_KEY_PK),

    // The actual key (hashed for security)
    keyHash: varchar({ length: 128 }).notNull(),

    // First 8 characters for display (e.g., "sk_live_abc...")
    keyPrefix: varchar({ length: 16 }).notNull(),

    // Key type determines access level
    type: varchar({ length: 20 }).notNull().default(ApiKeyType.USER),

    // Which team this key belongs to
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Optional: which user created/owns this key
    userId: ulidColumn().references(() => users.id, { onDelete: "set null" }),

    // Friendly name for the key (e.g., "Production API Key")
    name: varchar({ length: 100 }).notNull(),

    // Optional description
    description: varchar({ length: 500 }),

    // Permissions (JSON object for granular control)
    permissions: jsonb().$type<{
      canRead?: boolean;
      canWrite?: boolean;
      canDelete?: boolean;
      canManageTeam?: boolean;
      canManageUsers?: boolean;
      canAccessBilling?: boolean;
      allowedEndpoints?: string[];
      deniedEndpoints?: string[];
    }>(),

    // Rate limiting
    rateLimit: varchar({ length: 20 }).default("1000/hour"),

    // Is the key active?
    isActive: boolean().notNull().default(true),

    // Last time the key was used
    lastUsedAt: timestamp(),

    // Optional expiration
    expiresAt: timestamp(),

    // Standard timestamps
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.keyHash),
    index().on(t.keyPrefix),
    index().on(t.type),
    index().on(t.isActive),
  ],
);

// Type exports
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
