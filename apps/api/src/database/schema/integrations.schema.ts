import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { teamsRef } from "./teams.schema";
import { createdAt, updatedAt } from "../columns/timestamps";
import { AnyObject } from "@nextier/common";

// designed only per team per name
export const integrations = pgTable(
  "integrations",
  {
    id: primaryUlid("intg"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    name: varchar().notNull(),
    enabled: boolean().notNull(),
    settings: jsonb().$type<AnyObject>(),
    authData: jsonb().$type<AnyObject>(),
    tokenExpiresAt: timestamp(),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex().on(t.name, t.teamId)],
);

// the field mapping for integration usually for CRM only
export const integrationFields = pgTable(
  "integration_fields",
  {
    id: primaryUlid("intf"),
    integrationId: ulidColumn()
      .references(() => integrations.id, { onDelete: "cascade" })
      .notNull(),
    moduleName: varchar().notNull(),
    sourceField: varchar().notNull(), // our leads columns
    targetField: varchar().notNull(), // crm columns or fields or id
    subField: varchar(),
    metadata: jsonb().$type<AnyObject>(),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex().on(t.integrationId, t.moduleName, t.sourceField)],
);

export const integrationTasks = pgTable("integration_tasks", {
  id: primaryUlid("itask"),
  integrationId: ulidColumn()
    .references(() => integrations.id, { onDelete: "cascade" })
    .notNull(),
  moduleName: varchar().notNull(),
  status: varchar().notNull().default("PENDING"), // PENDING, FAILED, COMPLETED
  type: varchar().notNull(),
  metadata: jsonb(),
  createdAt,
  updatedAt,
});
