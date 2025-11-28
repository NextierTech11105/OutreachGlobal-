import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { users } from "./users.schema";
import { AchievementType, BadgeTier } from "@nextier/common";

// Primary key prefixes
export const ACHIEVEMENT_DEF_PK = "achdef";
export const USER_ACHIEVEMENT_PK = "uach";
export const USER_STATS_PK = "ustat";
export const ACHIEVEMENT_NOTIFICATION_PK = "achnot";
export const LEADERBOARD_SNAPSHOT_PK = "lbsnap";

// Achievement definitions
export const achievementDefinitions = pgTable("achievement_definitions", {
  id: primaryUlid(ACHIEVEMENT_DEF_PK),
  type: varchar().notNull().$type<AchievementType>(),
  name: varchar().notNull(),
  description: text().notNull(),
  icon: varchar().notNull(),
  tier: varchar().notNull().$type<BadgeTier>(),
  pointsValue: integer().notNull().default(10),
  targetCount: integer().notNull().default(1),
  category: varchar().notNull(),
  isRepeatable: boolean().default(false),
  animation: varchar().default("bounce"),
  soundEffect: varchar(),
  color: varchar().default("#6366f1"),
  glowColor: varchar().default("#818cf8"),
  metadata: jsonb(),
  createdAt,
  updatedAt,
});

// User achievements earned
export const userAchievements = pgTable(
  "user_achievements",
  {
    id: primaryUlid(USER_ACHIEVEMENT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    userId: ulidColumn()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    achievementId: ulidColumn()
      .references(() => achievementDefinitions.id, { onDelete: "cascade" })
      .notNull(),
    earnedAt: timestamp().notNull().defaultNow(),
    currentCount: integer().notNull().default(1),
    displayedAt: timestamp(),
    metadata: jsonb(),
    createdAt,
  },
  (t) => [
    index().on(t.userId),
    index().on(t.teamId),
    index().on(t.achievementId),
  ]
);

// User stats for gamification
export const userStats = pgTable(
  "user_stats",
  {
    id: primaryUlid(USER_STATS_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    userId: ulidColumn()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    // Points & Level
    totalPoints: integer().notNull().default(0),
    currentLevel: integer().notNull().default(1),
    pointsToNextLevel: integer().notNull().default(100),

    // Streaks
    currentStreak: integer().notNull().default(0),
    longestStreak: integer().notNull().default(0),
    lastActivityDate: timestamp(),

    // Counters
    numbersConfirmed: integer().notNull().default(0),
    positiveResponses: integer().notNull().default(0),
    leadsConverted: integer().notNull().default(0),
    campaignsCompleted: integer().notNull().default(0),
    messagesProcessed: integer().notNull().default(0),
    blacklistReviewed: integer().notNull().default(0),

    // Performance
    avgResponseTime: integer(),
    successRate: integer(),
    dailyGoalProgress: integer().default(0),
    dailyGoalTarget: integer().default(50),

    // Rankings
    weeklyRank: integer(),
    monthlyRank: integer(),
    allTimeRank: integer(),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.userId), index().on(t.teamId)]
);

// Achievement notifications queue
export const achievementNotifications = pgTable(
  "achievement_notifications",
  {
    id: primaryUlid(ACHIEVEMENT_NOTIFICATION_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    userId: ulidColumn()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    achievementId: ulidColumn()
      .references(() => achievementDefinitions.id, { onDelete: "cascade" })
      .notNull(),
    isDisplayed: boolean().default(false),
    displayedAt: timestamp(),
    createdAt,
  },
  (t) => [index().on(t.userId), index().on(t.isDisplayed)]
);

// Leaderboard snapshots
export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: primaryUlid(LEADERBOARD_SNAPSHOT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    period: varchar().notNull(),
    periodStart: timestamp().notNull(),
    periodEnd: timestamp().notNull(),
    rankings: jsonb()
      .notNull()
      .$type<
        {
          userId: string;
          rank: number;
          points: number;
          achievements: number;
        }[]
      >(),
    createdAt,
  },
  (t) => [index().on(t.teamId), index().on(t.period)]
);
