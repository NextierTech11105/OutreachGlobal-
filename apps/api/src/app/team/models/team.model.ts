import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { teamsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type TeamSelect = typeof teamsTable.$inferSelect;
export type TeamInsert = typeof teamsTable.$inferInsert;

@ObjectType()
export class TeamBranding {
  @StringField({ nullable: true })
  appName?: string;

  @StringField({ nullable: true })
  companyName?: string;

  @StringField({ nullable: true })
  logoUrl?: string;

  @StringField({ nullable: true })
  aiAssistantName?: string;

  @StringField({ nullable: true })
  themeKey?: string;
}

@ObjectType()
export class Team extends TimestampModel implements TeamSelect {
  ownerId: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  // SignalHouse multi-tenant mapping
  @StringField({ nullable: true })
  signalhouseSubGroupId: string | null;

  @StringField({ nullable: true })
  signalhouseBrandId: string | null;

  @Field(() => [String], { nullable: true })
  signalhouseCampaignIds: string[] | null;

  @Field(() => [String], { nullable: true })
  signalhousePhonePool: string[] | null;

  // NOTE: description and branding removed temporarily - columns don't exist in DB yet
  // @StringField({ nullable: true })
  // description: string | null;

  // @Field(() => TeamBranding, { nullable: true })
  // branding: {...} | null;
}
