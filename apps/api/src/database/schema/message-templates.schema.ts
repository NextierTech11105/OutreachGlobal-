import { jsonb, pgTable, varchar } from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { MessageTemplateType } from "@nextier/common";

export const messageTemplates = pgTable("message_templates", {
  id: primaryUlid("mt"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  type: varchar().notNull().$type<MessageTemplateType>(),
  name: varchar().notNull(),
  data: jsonb().notNull().$type<Record<string, any>>(), // body, script etc
  createdAt,
  updatedAt,
});
