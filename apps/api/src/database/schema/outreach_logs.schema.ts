import { pgTable, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { teams } from "./teams.schema";
import { leads } from "./leads.schema";
import { primaryUlid, ulidColumn } from "../columns/ulid";

export const outreachLogs = pgTable("outreach_logs", {
  id: primaryUlid("olog"),
  teamId: ulidColumn()
    .references(() => teams.id)
    .notNull(),
  leadId: ulidColumn()
    .references(() => leads.id)
    .notNull(),

  channel: varchar("channel").notNull(), // sms, email, call
  direction: varchar("direction").notNull(), // inbound, outbound
  workerName: varchar("worker_name"), // GIANNA, SABRINA, etc.

  content: text("content"),
  metadata: jsonb("metadata"), // Provider IDs (SignalHouse ID, Twilio Call SID)

  sentAt: timestamp("sent_at").defaultNow(),
});
