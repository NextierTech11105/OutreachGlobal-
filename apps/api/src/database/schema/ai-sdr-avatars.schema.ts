import { boolean, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";

export const aiSdrAvatars = pgTable("ai_sdr_avatars", {
  id: primaryUlid("aisdr"),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  name: varchar().notNull(),
  description: text(),
  personality: varchar().notNull(),
  voiceType: varchar().notNull(),
  avatarUri: varchar(),
  active: boolean().default(true),
  industry: varchar().notNull(),
  mission: varchar().notNull(),
  goal: varchar().notNull(),
  roles: text().array().notNull().default([]),
  faqs: jsonb()
    .$type<{ question: string; answer: string }[]>()
    .notNull()
    .default([]),
  tags: text().array().notNull().default([]),
  createdAt,
  updatedAt,
});
