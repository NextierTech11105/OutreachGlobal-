import { pgTable, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { teams } from "./teams.schema";
import { leads } from "./leads.schema";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt } from "../columns/timestamps";

export const sdrSessions = pgTable("sdr_sessions", {
  id: primaryUlid("sess"),
  teamId: ulidColumn()
    .references(() => teams.id)
    .notNull(),
  leadId: ulidColumn()
    .references(() => leads.id)
    .notNull(),

  status: varchar("status").default("active"), // active, completed, handed_off
  currentGoal: varchar("current_goal"), // "qualify", "schedule", "nurture"

  context: jsonb("context"), // Memory of conversation state

  lastInteractionAt: timestamp("last_interaction_at").defaultNow(),
  createdAt,
});
