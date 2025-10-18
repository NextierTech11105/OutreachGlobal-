import { Field, ObjectType } from "@nestjs/graphql";
import {
  BooleanField,
  IdField,
  IntField,
  StringField,
} from "@/app/apollo/decorators";
import { SendgridSettings as SendgridSettingsDto } from "@nextier/dto";
import { MaybeString } from "@/app/apollo/types/maybe.type";

@ObjectType()
export class SendgridSettings implements SendgridSettingsDto {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  sendgridApiKey?: MaybeString;

  @StringField({ nullable: true })
  sendgridFromName?: MaybeString;

  @StringField({ nullable: true })
  sendgridFromEmail?: MaybeString;

  @StringField({ nullable: true })
  sendgridReplyToEmail?: MaybeString;

  @Field(() => [String], { nullable: true })
  sendgridEventTypes?: string[];

  @IntField({ nullable: true })
  sendgridDailyLimit?: number;

  @IntField({ nullable: true })
  sendgridBatchSize?: number;

  @StringField({ nullable: true })
  sendgridIpPool?: string;

  @StringField({ nullable: true })
  sendgridEmailCategory?: string;

  @BooleanField({ nullable: true })
  sendgridEnableClickTracking?: boolean;

  @BooleanField({ nullable: true })
  sendgridEnableOpenTracking?: boolean;

  @BooleanField({ nullable: true })
  sendgridEnableSubscriptionTracking?: boolean;

  @StringField({ nullable: true })
  sendgridDefaultFooter?: MaybeString;
}

@ObjectType()
export class UpdateSendgridSettingsPayload {
  @Field()
  settings: SendgridSettings;
}
