import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AchievementDefinition } from "../models/achievement-definition.model";
import {
  UserAchievement,
  UserAchievementConnection,
} from "../models/user-achievement.model";
import { UserStats } from "../models/user-stats.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { AchievementService } from "../services/achievement.service";
import { User } from "@/app/user/models/user.model";
import {
  AchievementDefinitionsArgs,
  UserAchievementsArgs,
  UserStatsArgs,
  TriggerAchievementArgs,
  LeaderboardArgs,
  PendingNotificationsArgs,
  MarkNotificationDisplayedArgs,
} from "../args/achievement.args";
import {
  TriggerAchievementPayload,
  LeaderboardPayload,
  AchievementNotification,
  MarkNotificationDisplayedPayload,
  StreakInfo,
  LevelInfo,
} from "../objects/achievement.object";

@Resolver(() => AchievementDefinition)
@UseAuthGuard()
export class AchievementResolver extends BaseResolver(AchievementDefinition) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: AchievementService,
  ) {
    super();
  }

  @Query(() => [AchievementDefinition])
  async achievementDefinitions(@Args() args: AchievementDefinitionsArgs) {
    return this.service.getDefinitions(args.category, args.tier);
  }

  @Query(() => UserAchievementConnection)
  async userAchievements(
    @Auth() user: User,
    @Args() args: UserAchievementsArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const userId = args.userId || user.id;
    return this.service.getUserAchievements(team.id, userId, args.category);
  }

  @Query(() => UserStats)
  async userStats(@Auth() user: User, @Args() args: UserStatsArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const userId = args.userId || user.id;
    return this.service.getOrCreateUserStats(team.id, userId);
  }

  @Query(() => LeaderboardPayload)
  async leaderboard(@Auth() user: User, @Args() args: LeaderboardArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.getLeaderboard(team.id, args.period);
  }

  @Query(() => [AchievementNotification])
  async pendingAchievementNotifications(
    @Auth() user: User,
    @Args() args: PendingNotificationsArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const userId = args.userId || user.id;
    return this.service.getPendingNotifications(team.id, userId);
  }

  @Query(() => StreakInfo)
  async streakInfo(@Auth() user: User, @Args() args: UserStatsArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const userId = args.userId || user.id;
    const stats = await this.service.getOrCreateUserStats(team.id, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActivity = stats.lastActivityDate
      ? new Date(stats.lastActivityDate)
      : null;

    let isActiveToday = false;
    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
      isActiveToday = lastActivity.getTime() === today.getTime();
    }

    // Streak bonus: 10% per day, max 50%
    const streakBonus = Math.min(stats.currentStreak * 10, 50);

    return {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      isActiveToday,
      streakBonus,
    };
  }

  @Query(() => LevelInfo)
  async levelInfo(@Auth() user: User, @Args() args: UserStatsArgs) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const userId = args.userId || user.id;
    const stats = await this.service.getOrCreateUserStats(team.id, userId);

    const LEVEL_THRESHOLDS = [
      0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000,
    ];
    const currentThreshold = LEVEL_THRESHOLDS[stats.currentLevel - 1] || 0;
    const nextThreshold =
      LEVEL_THRESHOLDS[stats.currentLevel] || currentThreshold * 2;
    const pointsInLevel = stats.totalPoints - currentThreshold;
    const pointsNeeded = nextThreshold - currentThreshold;
    const progressPercent = Math.floor((pointsInLevel / pointsNeeded) * 100);

    return {
      currentLevel: stats.currentLevel,
      currentPoints: stats.totalPoints,
      pointsToNextLevel: stats.pointsToNextLevel,
      progressPercent,
    };
  }

  @Mutation(() => TriggerAchievementPayload)
  async triggerAchievement(
    @Auth() user: User,
    @Args() args: TriggerAchievementArgs,
  ): Promise<TriggerAchievementPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const userId = args.userId || user.id;
    return this.service.triggerAchievement(
      team.id,
      userId,
      args.input.type,
      args.input.incrementBy,
    );
  }

  @Mutation(() => MarkNotificationDisplayedPayload)
  async markAchievementNotificationDisplayed(
    @Auth() user: User,
    @Args() args: MarkNotificationDisplayedArgs,
  ): Promise<MarkNotificationDisplayedPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.markNotificationDisplayed(team.id, args.notificationId);
  }

  @Mutation(() => [AchievementDefinition])
  async initializeAchievements(@Auth() user: User) {
    // Admin only - would need proper authorization check
    return this.service.initializeDefaultAchievements();
  }
}
