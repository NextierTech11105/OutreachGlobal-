import { ObjectType, Field, Int } from "@nestjs/graphql";
import { AchievementDefinition, AchievementDefinitionSelect } from "../models/achievement-definition.model";
import { UserAchievement, UserAchievementSelect } from "../models/user-achievement.model";
import { UserStats, UserStatsSelect } from "../models/user-stats.model";
import { StringField, IntField, BooleanField } from "@/app/apollo/decorators";

@ObjectType()
export class CreateAchievementDefinitionPayload {
  @Field(() => AchievementDefinition)
  achievement: AchievementDefinitionSelect;
}

@ObjectType()
export class TriggerAchievementPayload {
  @BooleanField()
  awarded: boolean;

  @Field(() => UserAchievement, { nullable: true })
  achievement?: UserAchievementSelect;

  @IntField()
  pointsEarned: number;

  @BooleanField()
  leveledUp: boolean;

  @IntField({ nullable: true })
  newLevel?: number;
}

@ObjectType()
export class UpdateUserStatsPayload {
  @Field(() => UserStats)
  stats: UserStatsSelect;
}

@ObjectType()
export class LeaderboardEntry {
  @StringField()
  userId: string;

  @StringField()
  userName: string;

  @IntField()
  rank: number;

  @IntField()
  points: number;

  @IntField()
  achievements: number;

  @IntField()
  streak: number;
}

@ObjectType()
export class LeaderboardPayload {
  @Field(() => [LeaderboardEntry])
  entries: LeaderboardEntry[];

  @StringField()
  period: string;

  @Field(() => Date)
  periodStart: Date;

  @Field(() => Date)
  periodEnd: Date;
}

@ObjectType()
export class AchievementNotification {
  @StringField()
  id: string;

  @Field(() => AchievementDefinition)
  achievement: AchievementDefinitionSelect;

  @Field(() => Date)
  earnedAt: Date;

  @IntField()
  pointsEarned: number;
}

@ObjectType()
export class MarkNotificationDisplayedPayload {
  @BooleanField()
  success: boolean;
}

@ObjectType()
export class StreakInfo {
  @IntField()
  currentStreak: number;

  @IntField()
  longestStreak: number;

  @BooleanField()
  isActiveToday: boolean;

  @IntField()
  streakBonus: number;
}

@ObjectType()
export class LevelInfo {
  @IntField()
  currentLevel: number;

  @IntField()
  currentPoints: number;

  @IntField()
  pointsToNextLevel: number;

  @IntField()
  progressPercent: number;
}
