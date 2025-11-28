import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField, StringField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import { AchievementType, BadgeTier } from "@nextier/common";
import {
  CreateAchievementDefinitionInput,
  TriggerAchievementInput,
  UpdateUserStatsInput,
} from "../inputs/achievement.input";

@ArgsType()
export class AchievementDefinitionsArgs {
  @StringField({ nullable: true })
  category?: string;

  @StringField({ nullable: true })
  tier?: BadgeTier;
}

@ArgsType()
export class UserAchievementsArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @IdField({ nullable: true })
  userId?: string;

  @StringField({ nullable: true })
  category?: string;
}

@ArgsType()
export class UserStatsArgs extends BaseTeamArgs {
  @IdField({ nullable: true })
  userId?: string;
}

@ArgsType()
export class CreateAchievementDefinitionArgs {
  @Field()
  input: CreateAchievementDefinitionInput;
}

@ArgsType()
export class TriggerAchievementArgs extends BaseTeamArgs {
  @IdField({ nullable: true })
  userId?: string;

  @Field()
  input: TriggerAchievementInput;
}

@ArgsType()
export class UpdateUserStatsArgs extends BaseTeamArgs {
  @IdField({ nullable: true })
  userId?: string;

  @Field()
  input: UpdateUserStatsInput;
}

@ArgsType()
export class LeaderboardArgs extends BaseTeamArgs {
  @StringField({ nullable: true })
  period?: string;
}

@ArgsType()
export class PendingNotificationsArgs extends BaseTeamArgs {
  @IdField({ nullable: true })
  userId?: string;
}

@ArgsType()
export class MarkNotificationDisplayedArgs extends BaseTeamArgs {
  @IdField()
  notificationId: string;
}
