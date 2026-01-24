import { ObjectType, Field, Float, ID, registerEnumType } from "@nestjs/graphql";

export enum SuggestionStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

registerEnumType(SuggestionStatus, {
  name: "SuggestionStatus",
  description: "Status of a co-pilot response suggestion",
});

export enum ResponseTone {
  PROFESSIONAL = "PROFESSIONAL",
  FRIENDLY = "FRIENDLY",
  CASUAL = "CASUAL",
  URGENT = "URGENT",
}

registerEnumType(ResponseTone, {
  name: "ResponseTone",
  description: "Tone of the suggested response",
});

@ObjectType()
export class ResponseSuggestion {
  @Field(() => ID)
  id!: string;

  @Field()
  content!: string;

  @Field(() => Float)
  confidence!: number;

  @Field(() => ResponseTone)
  tone!: ResponseTone;

  @Field({ nullable: true })
  reasoning?: string;

  @Field(() => SuggestionStatus)
  status!: SuggestionStatus;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class CoPilotResponse {
  @Field(() => [ResponseSuggestion])
  suggestions!: ResponseSuggestion[];

  @Field()
  conversationId!: string;

  @Field()
  phoneNumber!: string;

  @Field()
  inboundMessage!: string;

  @Field({ nullable: true })
  leadName?: string;

  @Field({ nullable: true })
  campaignName?: string;

  @Field()
  generatedAt!: Date;
}

@ObjectType()
export class PhoneConfig {
  @Field()
  phoneNumber!: string;

  @Field()
  teamId!: string;

  @Field({ nullable: true })
  aiAgent?: string;

  @Field({ nullable: true })
  responseStyle?: string;

  @Field()
  coPilotEnabled!: boolean;

  @Field({ nullable: true })
  signalhouseCampaignId?: string;

  @Field({ nullable: true })
  signalhouseSubGroupId?: string;
}
