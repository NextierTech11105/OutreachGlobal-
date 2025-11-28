import { Field, InputType } from "@nestjs/graphql";
import { IdField, IntField, StringField } from "@/app/apollo/decorators";
import { CampaignDto } from "@nextier/dto";
import { MaybeString } from "@/app/apollo/types/maybe.type";

@InputType()
export class CampaignSequenceInput {
  @IdField({ nullable: true })
  id?: MaybeString;

  @Field()
  name: string;

  @Field()
  content: string;

  @StringField({ nullable: true })
  subject?: MaybeString;

  @StringField({ nullable: true })
  voiceType?: MaybeString;

  @Field()
  delayDays: number;

  @Field()
  delayHours: number;

  @IntField()
  position: number;

  @StringField()
  type: "SMS" | "VOICE" | "EMAIL";
}

@InputType({ isAbstract: true })
export class CampaignInput implements CampaignDto {
  @IdField()
  sdrId: string;

  @Field()
  name: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @Field(() => [CampaignSequenceInput])
  sequences: CampaignSequenceInput[];

  @IntField()
  minScore: number;

  @IntField()
  maxScore: number;
}

@InputType()
export class CreateCampaignInput extends CampaignInput {}

@InputType()
export class UpdateCampaignInput extends CampaignInput {}
