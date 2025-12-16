import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { ReferenceConfig } from "drizzle-orm/gel-core";
import { users } from "./users.schema";

export const TEAM_PK = "team";
export const TEAM_MEMBER_PK = "tm";

export const teams = pgTable(
  "teams",
  {
    id: primaryUlid(TEAM_PK),
    ownerId: ulidColumn()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    whiteLabelId: text("white_label_id"), // References white_labels.id
    name: varchar().notNull(),
    slug: varchar().notNull().unique(),
    description: text(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.ownerId), index().on(t.whiteLabelId)],
);

export const teamsRef = (config?: ReferenceConfig["actions"]) =>
  ulidColumn().references(() => teams.id, config);

export const teamMembers = pgTable(
  "team_members",
  {
    id: primaryUlid(TEAM_MEMBER_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    userId: ulidColumn().references(() => users.id, { onDelete: "cascade" }),
    role: varchar().notNull().default("MEMBER"),
    status: varchar().notNull().default("PENDING"),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.teamId), index().on(t.userId)],
);

export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: primaryUlid("ti"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    email: varchar().notNull(),
    invitedBy: ulidColumn().references(() => users.id, {
      onDelete: "set null",
    }),
    role: varchar().notNull().default("MEMBER"),
    expiresAt: timestamp().notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.teamId), uniqueIndex().on(t.teamId, t.email)],
);
