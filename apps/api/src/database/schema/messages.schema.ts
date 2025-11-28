import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { MessageDirection, MessageType } from "@nextier/common";
import { leads } from "./leads.schema";
import { campaigns } from "./campaigns.schema";

export const messages = pgTable("messages", {
  id: primaryUlid("msg"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  leadId: ulidColumn().references(() => leads.id, { onDelete: "cascade" }),
  campaignId: ulidColumn().references(() => campaigns.id, {
    onDelete: "cascade",
  }),
  externalId: varchar(),
  type: varchar().notNull().$type<MessageType>(),
  direction: varchar().notNull().$type<MessageDirection>(),
  status: varchar().notNull().default("ACTIVE"),
  toName: varchar(),
  toAddress: varchar(), // can be email address or phone number,
  fromName: varchar(),
  fromAddress: varchar(), // can be email address or phone number,
  subject: varchar(), //if email
  body: text(),
  metadata: jsonb(),
  createdAt,
  updatedAt,
  deletedAt: timestamp(),
});

export const messageLabels = pgTable("message_labels", {
  id: primaryUlid("msgl"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  name: varchar().notNull(),
  color: varchar(),
  createdAt,
  updatedAt,
});

export const messageLabelLinks = pgTable(
  "message_label_links",
  {
    messageId: ulidColumn().references(() => messages.id, {
      onDelete: "cascade",
    }),
    labelId: ulidColumn().references(() => messageLabels.id, {
      onDelete: "cascade",
    }),
  },
  (t) => [
    primaryKey({
      columns: [t.messageId, t.labelId],
    }),
  ],
);
