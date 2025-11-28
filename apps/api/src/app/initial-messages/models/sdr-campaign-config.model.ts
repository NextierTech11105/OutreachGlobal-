import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { sdrCampaignConfigsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type SdrCampaignConfigSelect = typeof sdrCampaignConfigsTable.$inferSelect;
export type SdrCampaignConfigInsert = typeof sdrCampaignConfigsTable.$inferInsert;

@ObjectType()
export class SdrCampaignConfig extends TimestampModel implements SdrCampaignConfigSelect {
  teamId: string;

  @StringField()
  sdrId: string;

  @StringField()
  campaignId: string;

  @BooleanField({ nullable: true })
  autoRespondToPositive: Maybe<boolean>;

  @BooleanField({ nullable: true })
  autoRespondToNeutral: Maybe<boolean>;

  @BooleanField({ nullable: true })
  escalateNegative: Maybe<boolean>;

  @IntField({ nullable: true })
  minResponseDelaySeconds: Maybe<number>;

  @IntField({ nullable: true })
  maxResponseDelaySeconds: Maybe<number>;

  @StringField({ nullable: true })
  activeHoursStart: MaybeString;

  @StringField({ nullable: true })
  activeHoursEnd: MaybeString;

  @Field(() => [String], { nullable: true })
  activeDays: Maybe<string[]>;

  @StringField({ nullable: true })
  timezone: MaybeString;

  @BooleanField({ nullable: true })
  useLeadFirstName: Maybe<boolean>;

  @StringField({ nullable: true })
  signatureStyle: MaybeString;

  @IntField({ nullable: true })
  maxDailyResponses: Maybe<number>;

  @IntField({ nullable: true })
  maxResponsesPerLead: Maybe<number>;

  metadata: Maybe<AnyObject>;
}
