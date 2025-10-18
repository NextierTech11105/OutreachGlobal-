import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teams } from "./teams.schema";
import { PromptCategory, PromptType } from "@nextier/common";

export const prompts = pgTable("prompts", {
  id: primaryUlid("prompt"),
  teamId: ulidColumn()
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar().notNull(),
  type: varchar().notNull().$type<PromptType>(),
  category: varchar().notNull().$type<PromptCategory>(),
  description: text(),
  content: text().notNull(),
  tags: text().array().default([]),
  createdAt,
  updatedAt,
});
