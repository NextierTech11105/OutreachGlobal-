import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { achievementDefinitionsTable } from "@/database/schema-alias";
import { ObjectType } from "@nestjs/graphql";
import { AnyObject, AchievementType, BadgeTier } from "@nextier/common";

export type AchievementDefinitionSelect =
  typeof achievementDefinitionsTable.$inferSelect;
export type AchievementDefinitionInsert =
  typeof achievementDefinitionsTable.$inferInsert;

@ObjectType()
export class AchievementDefinition
  extends TimestampModel
  implements AchievementDefinitionSelect
{
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

  @IntField()
  pointsValue: number;

  @IntField()
  targetCount: number;

  @StringField()
  category: string;

  @BooleanField({ nullable: true })
  isRepeatable: Maybe<boolean>;

  @StringField({ nullable: true })
  animation: MaybeString;

  @StringField({ nullable: true })
  soundEffect: MaybeString;

  @StringField({ nullable: true })
  color: MaybeString;

  @StringField({ nullable: true })
  glowColor: MaybeString;

  metadata: Maybe<AnyObject>;
}
