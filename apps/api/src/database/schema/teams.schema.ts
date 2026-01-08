import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
  boolean,
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

    // ═══════════════════════════════════════════════════════════════
    // TRIAL & DEMO MANAGEMENT
    // 30-day demo for new users, trial period before conversion
    // ═══════════════════════════════════════════════════════════════
    trialEndsAt: timestamp("trial_ends_at"),
    demoExpiresAt: timestamp("demo_expires_at"),
    isDemo: boolean("is_demo").default(true),
    onboardingCompleted: boolean("onboarding_completed").default(false),
    onboardingCompletedAt: timestamp("onboarding_completed_at"),

    // ═══════════════════════════════════════════════════════════════
    // WHITE-LABEL BRANDING
    // Custom branding for agency/enterprise plans
    // ═══════════════════════════════════════════════════════════════
    branding: jsonb().$type<{
      logo?: string;
      logoLight?: string;
      logoDark?: string;
      favicon?: string;
      primaryColor?: string;
      accentColor?: string;
      companyName?: string;
      supportEmail?: string;
      supportPhone?: string;
      customDomain?: string;
      hideNextierBranding?: boolean;
    }>(),

    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.ownerId),
    index("teams_signalhouse_idx").on(t.signalhouseSubGroupId),
    index("teams_trial_idx").on(t.trialEndsAt),
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
