import { Model } from "@/app/apollo/base-model";
import { IntField, StringField } from "@/app/apollo/decorators";
import { Maybe } from "@/app/apollo/types/maybe.type";
import { userAchievementsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";

export type UserAchievementSelect = typeof userAchievementsTable.$inferSelect;
export type UserAchievementInsert = typeof userAchievementsTable.$inferInsert;

@ObjectType()
export class UserAchievement extends Model implements UserAchievementSelect {
  teamId: string;

  @StringField()
  userId: string;

  @StringField()
  achievementId: string;

  @Field(() => Date)
  earnedAt: Date;

  @IntField()
  currentCount: number;

  @Field(() => Date, { nullable: true })
  displayedAt: Maybe<Date>;

  metadata: Maybe<AnyObject>;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class UserAchievementEdge extends WithEdge(UserAchievement) {}

@ObjectType()
export class UserAchievementConnection extends WithConnection(UserAchievementEdge) {}
