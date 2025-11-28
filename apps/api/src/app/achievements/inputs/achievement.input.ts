import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { InputType, registerEnumType } from "@nestjs/graphql";
import { AchievementType, BadgeTier } from "@nextier/common";

// Register enums for GraphQL
registerEnumType(AchievementType, { name: "AchievementType" });
registerEnumType(BadgeTier, { name: "BadgeTier" });

@InputType()
export class CreateAchievementDefinitionInput {
  @StringField()
  type: AchievementType;

  @StringField()
  name: string;

  @StringField()
  description: string;

  @StringField()
  icon: string;

  @StringField()
  tier: BadgeTier;

  @IntField({ defaultValue: 10 })
  pointsValue?: number;

  @IntField({ defaultValue: 1 })
  targetCount?: number;

  @StringField()
  category: string;

  @BooleanField({ nullable: true })
  isRepeatable?: boolean;

  @StringField({ nullable: true })
  animation?: MaybeString;

  @StringField({ nullable: true })
  soundEffect?: MaybeString;

  @StringField({ nullable: true })
  color?: MaybeString;

  @StringField({ nullable: true })
  glowColor?: MaybeString;
}

@InputType()
export class TriggerAchievementInput {
  @StringField()
  type: AchievementType;

  @IntField({ nullable: true })
  incrementBy?: number;
}

@InputType()
export class UpdateUserStatsInput {
  @IntField({ nullable: true })
  dailyGoalTarget?: number;
}
