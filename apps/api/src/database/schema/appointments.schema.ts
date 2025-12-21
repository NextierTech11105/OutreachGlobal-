import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { teams } from "./teams.schema";
import { leads } from "./leads.schema";
import { users } from "./users.schema";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";

export const appointments = pgTable("appointments", {
  id: primaryUlid("appt"),
  teamId: ulidColumn()
    .references(() => teams.id)
    .notNull(),
  leadId: ulidColumn()
    .references(() => leads.id)
    .notNull(),
  setterId: ulidColumn().references(() => users.id), // AI or Human setter
  closerId: ulidColumn().references(() => users.id),

  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: varchar("status").default("scheduled"), // scheduled, completed, no-show, cancelled

  meetingLink: text("meeting_link"),
  notes: text("notes"),

  createdAt,
  updatedAt,
});
