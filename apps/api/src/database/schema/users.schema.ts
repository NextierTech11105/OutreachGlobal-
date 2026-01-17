import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";

export const USER_PK = "user";
export const PERSONAL_ACCESS_TOKEN_PK = "pat";
export const users = pgTable("users", {
  id: primaryUlid(USER_PK),
  role: varchar().notNull().default("USER"),
  name: varchar().notNull(),
  email: varchar().notNull().unique(),
  password: text(),
  googleId: varchar().unique(),
  emailVerifiedAt: timestamp(),
  createdAt,
  updatedAt,
});

export const personalAccessTokens = pgTable(
  "personal_access_tokens",
  {
    id: primaryUlid(PERSONAL_ACCESS_TOKEN_PK),
    userId: ulidColumn()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar().notNull(),
    expiredAt: timestamp(),
    lastUsedAt: timestamp(),
    userAgent: jsonb().$type<Record<string, any>>(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.userId)],
);
