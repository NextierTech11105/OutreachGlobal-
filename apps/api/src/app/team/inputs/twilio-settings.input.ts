import { InputType } from "@nestjs/graphql";
import { BooleanField, IntField, StringField } from "@/app/apollo/decorators";
import { TwilioSettings as TwilioSettingsDto } from "@nextier/dto";
import { MaybeString } from "@/app/apollo/types/maybe.type";

@InputType()
export class TwilioSettingsInput implements TwilioSettingsDto {
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
