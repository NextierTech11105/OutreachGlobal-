import { IdField } from "@/app/apollo/decorators";
import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class TwilioPhoneCapability {
  @Field()
  voice: boolean;

  @Field()
  sms: boolean;

  @Field()
  mms: boolean;
}

@ObjectType()
export class TwilioPhone {
  @IdField()
  sid: string;

  @Field()
  phoneNumber: string;

  @Field()
  friendlyName: string;

  @Field()
  status: string;

  @Field()
  capabilities: TwilioPhoneCapability;
}

@ObjectType()
export class PurchaseTwilioPhonePayload {
  @Field()
  phone: TwilioPhone;
}

@ObjectType()
export class DeleteTwilioPhonePayload {
  @Field()
  deletedSid: string;
}
