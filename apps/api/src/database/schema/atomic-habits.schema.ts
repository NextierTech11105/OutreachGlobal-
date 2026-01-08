import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { ulidRef } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { usersRef } from "./users.schema";
import { teamsRef } from "./teams.schema";

/**
 * User Habits Tracking
 * Tracks daily actions to build streaks and habits
 */
export const userHabits = pgTable(
  "user_habits",
  {
    id: ulidRef().primaryKey(),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    userId: usersRef({ onDelete: "cascade" }).notNull(),
    date: date("date").notNull(),

    // Daily actions
    leadsImported: integer("leads_imported").default(0).notNull(),
    campaignsSent: integer("campaigns_sent").default(0).notNull(),
    inboxChecks: integer("inbox_checks").default(0).notNull(),
    repliesSent: integer("replies_sent").default(0).notNull(),
    meetingsBooked: integer("meetings_booked").default(0).notNull(),

    // Completion tracking
    completedDailyGoal: boolean("completed_daily_goal").default(false).notNull(),
    streakCount: integer("streak_count").default(0).notNull(),

    createdAt,
    updatedAt,
  },
  (t) => [unique().on(t.userId, t.date)]
);

/**
 * User Levels & XP
 * Gamification system for user progression
 */
export const userLevels = pgTable("user_levels", {
  id: ulidRef().primaryKey(),
  userId: usersRef({ onDelete: "cascade" }).notNull().unique(),

  // Level system
  currentLevel: integer("current_level").default(1).notNull(),
  xpPoints: integer("xp_points").default(0).notNull(),

  // Lifetime stats
  totalCampaigns: integer("total_campaigns").default(0).notNull(),
  totalMeetings: integer("total_meetings").default(0).notNull(),
  totalDeals: integer("total_deals").default(0).notNull(),
  totalRevenue: integer("total_revenue").default(0).notNull(),

  // Badges earned
  badges: jsonb("badges").$type<string[]>().default([]).notNull(),

  createdAt,
  updatedAt,
});

/**
 * Daily Goals (Customizable per user)
 */
export const dailyGoals = pgTable("daily_goals", {
  id: ulidRef().primaryKey(),
  userId: usersRef({ onDelete: "cascade" }).notNull().unique(),

  leadsGoal: integer("leads_goal").default(50).notNull(),
  campaignsGoal: integer("campaigns_goal").default(1).notNull(),
  inboxChecksGoal: integer("inbox_checks_goal").default(3).notNull(),
  meetingsGoal: integer("meetings_goal").default(1).notNull(),

  updatedAt,
});

/**
 * XP Transactions
 * Audit log of all XP earned
 */
export const xpTransactions = pgTable("xp_transactions", {
  id: ulidRef().primaryKey(),
  userId: usersRef({ onDelete: "cascade" }).notNull(),

  actionType: text("action_type").notNull(),
  xpAmount: integer("xp_amount").notNull(),
  description: text("description"),

  // Context
  relatedId: text("related_id"), // Campaign ID, Lead ID, etc.
  relatedType: text("related_type"), // "campaign", "lead", "meeting"

  createdAt,
});

/**
 * Achievements & Badges
 */
export const achievements = pgTable("achievements", {
  id: ulidRef().primaryKey(),

  // Badge details
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),

  // Unlock criteria
  criteriaType: text("criteria_type").notNull(), // "streak", "count", "milestone"
  criteriaValue: integer("criteria_value").notNull(),

  // Rewards
  xpReward: integer("xp_reward").default(0).notNull(),

  createdAt,
});

/**
 * User Achievements (Unlocked badges)
 */
export const userAchievements = pgTable(
  "user_achievements",
  {
    id: ulidRef().primaryKey(),
    userId: usersRef({ onDelete: "cascade" }).notNull(),
    achievementId: ulidRef().notNull(),

    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.achievementId)]
);

/**
 * Onboarding Progress
 */
export const onboardingProgress = pgTable("onboarding_progress", {
  id: ulidRef().primaryKey(),
  userId: usersRef({ onDelete: "cascade" }).notNull(),

  currentDay: integer("current_day").default(1).notNull(),
  currentStep: integer("current_step").default(1).notNull(),
  totalDays: integer("total_days").default(7).notNull(),

  // Step tracking
  importLeadsCompleted: boolean("import_leads_completed").default(false).notNull(),
  sendCampaignCompleted: boolean("send_campaign_completed").default(false).notNull(),
  checkInboxCompleted: boolean("check_inbox_completed").default(false).notNull(),
  replyLeadCompleted: boolean("reply_lead_completed").default(false).notNull(),
  bookMeetingCompleted: boolean("book_meeting_completed").default(false).notNull(),

  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  completed: boolean("completed").default(false).notNull(),

  createdAt,
  updatedAt,
});
