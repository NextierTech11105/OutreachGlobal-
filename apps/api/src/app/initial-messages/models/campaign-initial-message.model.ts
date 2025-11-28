import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { campaignInitialMessagesTable } from "@/database/schema-alias";
import { ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type CampaignInitialMessageSelect = typeof campaignInitialMessagesTable.$inferSelect;
export type CampaignInitialMessageInsert = typeof campaignInitialMessagesTable.$inferInsert;

@ObjectType()
export class CampaignInitialMessage extends TimestampModel implements CampaignInitialMessageSelect {
  @StringField()
  campaignId: string;

  @StringField()
  initialMessageId: string;

  @StringField({ nullable: true })
  assignedSdrId: MaybeString;

  @IntField()
  position: number;

  @IntField()
  weight: number;

  @BooleanField({ nullable: true })
  isActive: Maybe<boolean>;

  @IntField()
  sentCount: number;

  @IntField()
  responseCount: number;

  @IntField()
  positiveResponseCount: number;

  metadata: Maybe<AnyObject>;
}
