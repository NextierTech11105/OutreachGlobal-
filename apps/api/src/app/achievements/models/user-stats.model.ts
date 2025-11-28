import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField } from "@/app/apollo/decorators";
import { Maybe } from "@/app/apollo/types/maybe.type";
import { userStatsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type UserStatsSelect = typeof userStatsTable.$inferSelect;
export type UserStatsInsert = typeof userStatsTable.$inferInsert;

@ObjectType()
export class UserStats extends TimestampModel implements UserStatsSelect {
  teamId: string;

  @StringField()
  userId: string;

  @IntField()
  totalPoints: number;

  @IntField()
  currentLevel: number;

  @IntField()
  pointsToNextLevel: number;

  @IntField()
  currentStreak: number;

  @IntField()
  longestStreak: number;

  @Field(() => Date, { nullable: true })
  lastActivityDate: Maybe<Date>;

  @IntField()
  numbersConfirmed: number;

  @IntField()
  positiveResponses: number;

  @IntField()
  leadsConverted: number;

  @IntField()
  campaignsCompleted: number;

  @IntField()
  messagesProcessed: number;

  @IntField()
  blacklistReviewed: number;

  @IntField({ nullable: true })
  avgResponseTime: Maybe<number>;

  @IntField({ nullable: true })
  successRate: Maybe<number>;

  @IntField({ nullable: true })
  dailyGoalProgress: Maybe<number>;

  @IntField({ nullable: true })
  dailyGoalTarget: Maybe<number>;

  @IntField({ nullable: true })
  weeklyRank: Maybe<number>;

  @IntField({ nullable: true })
  monthlyRank: Maybe<number>;

  @IntField({ nullable: true })
  allTimeRank: Maybe<number>;

  metadata: Maybe<AnyObject>;
}
