import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { integrations } from "./integrations.schema";
import { properties } from "./properties.schema";

export const leads = pgTable(
  "leads",
  {
    id: primaryUlid("lead"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    integrationId: ulidColumn().references(() => integrations.id, {
      onDelete: "set null",
    }),
    propertyId: ulidColumn().references(() => properties.id, {
      onDelete: "set null",
    }),
    position: integer().notNull().default(0),
    externalId: varchar(),
    firstName: varchar(),
    lastName: varchar(),
    email: varchar(),
    phone: varchar(),
    title: varchar(),
    company: varchar(),
    status: varchar(),
    score: integer().notNull().default(0),
    tags: text().array(),
    zipCode: varchar(),
    country: varchar(),
    state: varchar(),
    city: varchar(),
    address: varchar(),
    source: varchar(),
    notes: text(),
    metadata: jsonb(),
    customFields: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    uniqueIndex().on(t.teamId, t.integrationId, t.externalId),
    index().on(t.score),
    // Phone lookup indexes for DNC/opt-out checks
    index("leads_phone_idx").on(t.phone),
    index("leads_team_phone_idx").on(t.teamId, t.phone),
    index("leads_team_status_idx").on(t.teamId, t.status),
  ],
);

export const leadPhoneNumbers = pgTable(
  "lead_phone_numbers",
  {
    id: primaryUlid("lpn"),
    leadId: ulidColumn()
      .references(() => leads.id, {
        onDelete: "cascade",
      })
      .notNull(),
    phone: varchar().notNull(),
    label: varchar().notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.leadId),
    index("lead_phone_numbers_phone_idx").on(t.phone),
    index("lead_phone_numbers_lead_phone_idx").on(t.leadId, t.phone),
  ],
);

export const importLeadPresets = pgTable("import_lead_presets", {
  id: primaryUlid("ilp"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  name: varchar().notNull(),
  config: jsonb().$type<Record<string, any>>(),
  createdAt,
  updatedAt,
});
