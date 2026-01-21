import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
    name: varchar().notNull(),
    slug: varchar().notNull().unique(),

    // ═══════════════════════════════════════════════════════════════
    // SIGNALHOUSE MULTI-TENANT MAPPING
    // Nextier Team = SignalHouse SubGroup (1:1)
    // Like Perplexity/Lovable piggyback on OpenAI, we piggyback on SignalHouse
    // ═══════════════════════════════════════════════════════════════
    signalhouseSubGroupId: varchar("signalhouse_subgroup_id"),
    signalhouseBrandId: varchar("signalhouse_brand_id"),
    signalhouseCampaignIds: jsonb("signalhouse_campaign_ids").$type<string[]>(),
    signalhousePhonePool: jsonb("signalhouse_phone_pool").$type<string[]>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.ownerId),
    index("teams_signalhouse_idx").on(t.signalhouseSubGroupId),
  ],
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

// ═══════════════════════════════════════════════════════════════
// DRIZZLE RELATIONS
// Required for `with: { team: true }` queries in user.service.ts
// ═══════════════════════════════════════════════════════════════
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
  members: many(teamMembers),
  invitations: many(teamInvitations),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  team: one(teams, { fields: [teamInvitations.teamId], references: [teams.id] }),
  inviter: one(users, { fields: [teamInvitations.invitedBy], references: [users.id] }),
}));
