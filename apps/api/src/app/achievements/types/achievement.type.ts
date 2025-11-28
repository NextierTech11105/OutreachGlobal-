import { AchievementType, BadgeTier } from "@nextier/common";

export interface AchievementTrigger {
  userId: string;
  teamId: string;
  type: AchievementType;
  incrementBy?: number;
}

export interface LevelUpResult {
  newLevel: number;
  pointsEarned: number;
  pointsToNextLevel: number;
}

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  points: number;
  achievements: number;
  streak: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
}
