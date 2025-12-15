import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc, count, SQL } from "drizzle-orm";
import {
  achievementDefinitionsTable,
  userAchievementsTable,
  userStatsTable,
  achievementNotificationsTable,
  leaderboardSnapshotsTable,
} from "@/database/schema-alias";
import { AchievementType, BadgeTier } from "@nextier/common";
import { ModelNotFoundError } from "@/database/exceptions";

// Points required per level (exponential growth)
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000,
];

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Get all achievement definitions
   */
  async getDefinitions(category?: string, tier?: BadgeTier) {
    const conditions: SQL[] = [];
    if (category)
      conditions.push(eq(achievementDefinitionsTable.category, category));
    if (tier) conditions.push(eq(achievementDefinitionsTable.tier, tier));

    return this.db.query.achievementDefinitions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(teamId: string, userId: string, category?: string) {
    const achievements = await this.db.query.userAchievements.findMany({
      where: and(
        eq(userAchievementsTable.teamId, teamId),
        eq(userAchievementsTable.userId, userId),
      ),
      orderBy: [desc(userAchievementsTable.earnedAt)],
    });

    return {
      edges: achievements.map((a) => ({ node: a, cursor: a.id })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: achievements[0]?.id,
        endCursor: achievements[achievements.length - 1]?.id,
      },
    };
  }

  /**
   * Get or create user stats
   */
  async getOrCreateUserStats(teamId: string, userId: string) {
    let stats = await this.db.query.userStats.findFirst({
      where: and(
        eq(userStatsTable.teamId, teamId),
        eq(userStatsTable.userId, userId),
      ),
    });

    if (!stats) {
      [stats] = await this.db
        .insert(userStatsTable)
        .values({
          teamId,
          userId,
          totalPoints: 0,
          currentLevel: 1,
          pointsToNextLevel: 100,
          currentStreak: 0,
          longestStreak: 0,
          numbersConfirmed: 0,
          positiveResponses: 0,
          leadsConverted: 0,
          campaignsCompleted: 0,
          messagesProcessed: 0,
          blacklistReviewed: 0,
        })
        .returning();
    }

    return stats;
  }

  /**
   * Trigger an achievement (increment progress and award if threshold met)
   */
  async triggerAchievement(
    teamId: string,
    userId: string,
    type: AchievementType,
    incrementBy: number = 1,
  ) {
    // Get achievement definition
    const definition = await this.db.query.achievementDefinitions.findFirst({
      where: eq(achievementDefinitionsTable.type, type),
    });

    if (!definition) {
      this.logger.warn(`Achievement type ${type} not found`);
      return { awarded: false, pointsEarned: 0, leveledUp: false };
    }

    // Get or create user stats
    const stats = await this.getOrCreateUserStats(teamId, userId);

    // Update the relevant counter based on achievement type
    const counterField = this.getCounterFieldForType(type);
    const currentCount = (stats as any)[counterField] ?? 0;
    const newCount = currentCount + incrementBy;

    // Update stats
    await this.db
      .update(userStatsTable)
      .set({
        [counterField]: newCount,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userStatsTable.id, stats.id));

    // Check if achievement threshold is met
    if (newCount >= definition.targetCount) {
      // Check if already earned (unless repeatable)
      const existing = await this.db.query.userAchievements.findFirst({
        where: and(
          eq(userAchievementsTable.teamId, teamId),
          eq(userAchievementsTable.userId, userId),
          eq(userAchievementsTable.achievementId, definition.id),
        ),
      });

      if (existing && !definition.isRepeatable) {
        return { awarded: false, pointsEarned: 0, leveledUp: false };
      }

      // Award achievement
      const [achievement] = await this.db
        .insert(userAchievementsTable)
        .values({
          teamId,
          userId,
          achievementId: definition.id,
          earnedAt: new Date(),
          currentCount: newCount,
        })
        .returning();

      // Create notification
      await this.db.insert(achievementNotificationsTable).values({
        teamId,
        userId,
        achievementId: definition.id,
      });

      // Award points
      const pointsEarned = definition.pointsValue;
      const newTotalPoints = stats.totalPoints + pointsEarned;
      const { newLevel, leveledUp } = this.calculateLevel(newTotalPoints);

      await this.db
        .update(userStatsTable)
        .set({
          totalPoints: newTotalPoints,
          currentLevel: newLevel,
          pointsToNextLevel: this.getPointsToNextLevel(
            newLevel,
            newTotalPoints,
          ),
        })
        .where(eq(userStatsTable.id, stats.id));

      this.logger.log(
        `User ${userId} earned ${definition.name} (+${pointsEarned} points)`,
      );

      return {
        awarded: true,
        achievement,
        pointsEarned,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
      };
    }

    return { awarded: false, pointsEarned: 0, leveledUp: false };
  }

  /**
   * Get pending achievement notifications
   */
  async getPendingNotifications(teamId: string, userId: string) {
    const notifications = await this.db.query.achievementNotifications.findMany(
      {
        where: and(
          eq(achievementNotificationsTable.teamId, teamId),
          eq(achievementNotificationsTable.userId, userId),
          eq(achievementNotificationsTable.isDisplayed, false),
        ),
      },
    );

    const result: Array<{
      id: string;
      achievement: any;
      earnedAt: Date;
      pointsEarned: number;
    }> = [];
    for (const notif of notifications) {
      const achievement = await this.db.query.achievementDefinitions.findFirst({
        where: eq(achievementDefinitionsTable.id, notif.achievementId),
      });
      if (achievement) {
        result.push({
          id: notif.id,
          achievement,
          earnedAt: notif.createdAt,
          pointsEarned: achievement.pointsValue,
        });
      }
    }

    return result;
  }

  /**
   * Mark notification as displayed
   */
  async markNotificationDisplayed(teamId: string, notificationId: string) {
    await this.db
      .update(achievementNotificationsTable)
      .set({ isDisplayed: true, displayedAt: new Date() })
      .where(
        and(
          eq(achievementNotificationsTable.teamId, teamId),
          eq(achievementNotificationsTable.id, notificationId),
        ),
      );

    return { success: true };
  }

  /**
   * Update user streak
   */
  async updateStreak(teamId: string, userId: string) {
    const stats = await this.getOrCreateUserStats(teamId, userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = stats.lastActivityDate
      ? new Date(stats.lastActivityDate)
      : null;

    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        // Continue streak
        const newStreak = stats.currentStreak + 1;
        const longestStreak = Math.max(newStreak, stats.longestStreak);

        await this.db
          .update(userStatsTable)
          .set({
            currentStreak: newStreak,
            longestStreak,
            lastActivityDate: new Date(),
          })
          .where(eq(userStatsTable.id, stats.id));

        return { currentStreak: newStreak, longestStreak, isActiveToday: true };
      } else if (diffDays > 1) {
        // Break streak
        await this.db
          .update(userStatsTable)
          .set({ currentStreak: 1, lastActivityDate: new Date() })
          .where(eq(userStatsTable.id, stats.id));

        return {
          currentStreak: 1,
          longestStreak: stats.longestStreak,
          isActiveToday: true,
        };
      }
    } else {
      // First activity
      await this.db
        .update(userStatsTable)
        .set({
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: new Date(),
        })
        .where(eq(userStatsTable.id, stats.id));

      return { currentStreak: 1, longestStreak: 1, isActiveToday: true };
    }

    return {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      isActiveToday: true,
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(teamId: string, period: string = "weekly") {
    const stats = await this.db.query.userStats.findMany({
      where: eq(userStatsTable.teamId, teamId),
      orderBy: [desc(userStatsTable.totalPoints)],
      limit: 50,
    });

    const now = new Date();
    const periodStart = new Date(now);
    const periodEnd = new Date(now);

    if (period === "weekly") {
      periodStart.setDate(now.getDate() - now.getDay());
      periodEnd.setDate(periodStart.getDate() + 6);
    } else if (period === "monthly") {
      periodStart.setDate(1);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
    }

    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(23, 59, 59, 999);

    const entries = stats.map((s, index) => ({
      userId: s.userId,
      userName: `User ${s.userId.slice(-4)}`, // Would need to join with users table
      rank: index + 1,
      points: s.totalPoints,
      achievements: 0, // Would need to count from userAchievements
      streak: s.currentStreak,
    }));

    return { entries, period, periodStart, periodEnd };
  }

  /**
   * Initialize default achievement definitions
   */
  async initializeDefaultAchievements() {
    const defaults = [
      {
        type: AchievementType.NUMBER_CONFIRMED,
        name: "Number Detective",
        description: "Confirm your first phone number",
        icon: "phone-check",
        tier: BadgeTier.BRONZE,
        pointsValue: 10,
        targetCount: 1,
        category: "verification",
      },
      {
        type: AchievementType.NUMBER_CONFIRMED,
        name: "Phone Book Pro",
        description: "Confirm 100 phone numbers",
        icon: "phone-check",
        tier: BadgeTier.SILVER,
        pointsValue: 50,
        targetCount: 100,
        category: "verification",
      },
      {
        type: AchievementType.POSITIVE_RESPONSE,
        name: "First Win",
        description: "Get your first positive response",
        icon: "thumbs-up",
        tier: BadgeTier.BRONZE,
        pointsValue: 15,
        targetCount: 1,
        category: "engagement",
      },
      {
        type: AchievementType.POSITIVE_RESPONSE,
        name: "Crowd Pleaser",
        description: "Get 50 positive responses",
        icon: "heart",
        tier: BadgeTier.GOLD,
        pointsValue: 100,
        targetCount: 50,
        category: "engagement",
      },
      {
        type: AchievementType.STREAK_MILESTONE,
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        icon: "flame",
        tier: BadgeTier.SILVER,
        pointsValue: 25,
        targetCount: 7,
        category: "consistency",
      },
      {
        type: AchievementType.BLACKLIST_REVIEWED,
        name: "Gatekeeper",
        description: "Review 10 blacklist entries",
        icon: "shield",
        tier: BadgeTier.BRONZE,
        pointsValue: 20,
        targetCount: 10,
        category: "moderation",
      },
    ];

    for (const def of defaults) {
      await this.db
        .insert(achievementDefinitionsTable)
        .values(def)
        .onConflictDoNothing();
    }

    return this.getDefinitions();
  }

  // Helper methods
  private getCounterFieldForType(type: AchievementType): string {
    const mapping: Partial<Record<AchievementType, string>> = {
      [AchievementType.NUMBER_CONFIRMED]: "numbersConfirmed",
      [AchievementType.POSITIVE_RESPONSE]: "positiveResponses",
      [AchievementType.LEAD_CONVERTED]: "leadsConverted",
      [AchievementType.CAMPAIGN_COMPLETED]: "campaignsCompleted",
      [AchievementType.MESSAGES_PROCESSED]: "messagesProcessed",
      [AchievementType.BLACKLIST_REVIEWED]: "blacklistReviewed",
      [AchievementType.STREAK_MILESTONE]: "currentStreak",
      [AchievementType.STREAK_3_DAY]: "currentStreak",
      [AchievementType.STREAK_7_DAY]: "currentStreak",
      [AchievementType.STREAK_30_DAY]: "currentStreak",
      [AchievementType.LEVEL_UP]: "currentLevel",
      [AchievementType.DAILY_GOAL]: "messagesProcessed",
      [AchievementType.FIRST_CONTACT]: "messagesProcessed",
      [AchievementType.SPEED_DEMON]: "messagesProcessed",
      [AchievementType.INBOX_ZERO]: "messagesProcessed",
      [AchievementType.TOP_PERFORMER]: "totalPoints",
      [AchievementType.AI_ASSIST_MASTER]: "messagesProcessed",
      [AchievementType.BLACKLIST_GUARDIAN]: "blacklistReviewed",
      [AchievementType.QUALITY_CHECKER]: "messagesProcessed",
    };
    return mapping[type] || "messagesProcessed";
  }

  private calculateLevel(totalPoints: number): {
    newLevel: number;
    leveledUp: boolean;
  } {
    let newLevel = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalPoints >= LEVEL_THRESHOLDS[i]) {
        newLevel = i + 1;
        break;
      }
    }
    return { newLevel, leveledUp: true };
  }

  private getPointsToNextLevel(
    currentLevel: number,
    totalPoints: number,
  ): number {
    const nextThreshold =
      LEVEL_THRESHOLDS[currentLevel] ||
      LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 2;
    return nextThreshold - totalPoints;
  }
}
