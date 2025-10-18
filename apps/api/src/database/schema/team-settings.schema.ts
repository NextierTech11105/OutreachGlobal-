import {
  boolean,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

export const teamSettings = pgTable(
  "team_settings",
  {
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    name: varchar().notNull(),
    value: text(),
    maskedValue: text(),
    isMasked: boolean().default(false),
    type: varchar().notNull().default("string"),
    metadata: jsonb(),
    scope: varchar().notNull(), //twilio etc
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex().on(t.teamId, t.name, t.scope)],
);
