import { Field, ObjectType } from "@nestjs/graphql";
import {
  BooleanField,
  IdField,
  IntField,
  StringField,
} from "@/app/apollo/decorators";
import { TwilioSettings as TwilioSettingsDto } from "@nextier/dto";
import { MaybeString } from "@/app/apollo/types/maybe.type";

@ObjectType()
export class TwilioSettings implements TwilioSettingsDto {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  twilioAccountSid?: MaybeString;

  @StringField({ nullable: true })
  twilioAuthToken?: MaybeString;

  @StringField({ nullable: true })
  twilioApiKey?: MaybeString;

  @StringField({ nullable: true })
  twilioApiSecret?: MaybeString;

  @StringField({ nullable: true })
  twilioDefaultPhoneNumber?: MaybeString;

  @StringField({ nullable: true })
  twiMLAppSid?: MaybeString;

  @BooleanField({ nullable: true })
  twilioEnableVoiceCalls?: boolean;

  @BooleanField({ nullable: true })
  twilioEnableRecordCalls?: boolean;

  @BooleanField({ nullable: true })
  twilioTranscribeVoicemail?: boolean;

  @IntField({ nullable: true })
  twilioCallTimeout?: number;

  @StringField({ nullable: true })
  twilioDefaultVoiceMessage?: MaybeString;

  @BooleanField({ nullable: true })
  twilioEnableSms?: boolean;
}

@ObjectType()
export class UpdateTwilioSettingsPayload {
  @Field()
  settings: TwilioSettings;
}
