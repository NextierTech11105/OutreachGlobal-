import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { Field, InputType, registerEnumType } from "@nestjs/graphql";
import { InitialMessageCategory, MessageTone } from "@nextier/common";

// Register enums
registerEnumType(InitialMessageCategory, { name: "InitialMessageCategory" });
registerEnumType(MessageTone, { name: "MessageTone" });

@InputType()
export class CreateInitialMessageInput {
  @StringField()
  name: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @StringField()
  content: string;

  @StringField()
  category: InitialMessageCategory;

  @StringField({ nullable: true })
  tone?: MessageTone;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @StringField({ nullable: true })
  defaultSdrId?: MaybeString;
}

@InputType()
export class UpdateInitialMessageInput {
  @StringField({ nullable: true })
  name?: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @StringField({ nullable: true })
  content?: string;

  @StringField({ nullable: true })
  category?: InitialMessageCategory;

  @StringField({ nullable: true })
  tone?: MessageTone;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @StringField({ nullable: true })
  defaultSdrId?: MaybeString;

  @BooleanField({ nullable: true })
  isActive?: boolean;
}

@InputType()
export class CreateMessageVariantInput {
  @StringField()
  parentMessageId: string;

  @StringField()
  variantName: string;

  @StringField()
  content: string;
}

@InputType()
export class AssignMessageToCampaignInput {
  @StringField()
  campaignId: string;

  @StringField()
  initialMessageId: string;

  @StringField({ nullable: true })
  assignedSdrId?: MaybeString;

  @IntField({ nullable: true })
  position?: number;

  @IntField({ nullable: true })
  weight?: number;
}

@InputType()
export class UpdateSdrCampaignConfigInput {
  @BooleanField({ nullable: true })
  autoRespondToPositive?: boolean;

  @BooleanField({ nullable: true })
  autoRespondToNeutral?: boolean;

  @BooleanField({ nullable: true })
  escalateNegative?: boolean;

  @IntField({ nullable: true })
  minResponseDelaySeconds?: number;

  @IntField({ nullable: true })
  maxResponseDelaySeconds?: number;

  @StringField({ nullable: true })
  activeHoursStart?: string;

  @StringField({ nullable: true })
  activeHoursEnd?: string;

  @Field(() => [String], { nullable: true })
  activeDays?: string[];

  @StringField({ nullable: true })
  timezone?: string;

  @BooleanField({ nullable: true })
  useLeadFirstName?: boolean;

  @StringField({ nullable: true })
  signatureStyle?: string;

  @IntField({ nullable: true })
  maxDailyResponses?: number;

  @IntField({ nullable: true })
  maxResponsesPerLead?: number;
}
