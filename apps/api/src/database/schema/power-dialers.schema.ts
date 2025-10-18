import {
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamMembers, teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";
import { DialerMode } from "@nextier/common";
import { aiSdrAvatars } from "./ai-sdr-avatars.schema";

export const powerDialers = pgTable("power_dialers", {
  id: primaryUlid("pd"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  memberId: ulidColumn(), //not sure we need it but lets keep it
  title: varchar().notNull(),
  createdAt,
  updatedAt,
});

export const dialerContacts = pgTable(
  "dialer_contacts",
  {
    id: primaryUlid("dc"),
    powerDialerId: ulidColumn()
      .references(() => powerDialers.id, { onDelete: "cascade" })
      .notNull(),
    leadId: ulidColumn().references(() => leads.id, { onDelete: "cascade" }),
    position: integer().notNull(), //queue position
    status: varchar().notNull().default("PENDING"),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex().on(t.powerDialerId, t.leadId)],
);

export const callHistories = pgTable("call_histories", {
  id: primaryUlid("ch"),
  dialerContactId: ulidColumn()
    .references(() => dialerContacts.id, { onDelete: "cascade" })
    .notNull(),
  powerDialerId: ulidColumn()
    .references(() => powerDialers.id, { onDelete: "cascade" })
    .notNull(),
  sid: varchar(),
  dialerMode: varchar().notNull().$type<DialerMode>(),
  teamMemberId: ulidColumn().references(() => teamMembers.id, {
    onDelete: "set null",
  }),
  aiSdrAvatarId: ulidColumn().references(() => aiSdrAvatars.id, {
    onDelete: "set null",
  }),
  duration: integer().notNull().default(0),
  disposition: varchar(),
  notes: text(),
  sentiment: jsonb(),
  createdAt,
  updatedAt,
});

export const callRecordings = pgTable("call_recordings", {
  id: primaryUlid("cr"),
  callHistoryId: ulidColumn()
    .references(() => callHistories.id, { onDelete: "cascade" })
    .notNull(),
  sid: varchar(),
  status: varchar().notNull().default("UNKNOWN"),
  duration: integer().notNull().default(0), //maybe in seconds
  url: varchar(),
  createdAt,
  updatedAt,
});
