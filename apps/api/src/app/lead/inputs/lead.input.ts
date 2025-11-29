import { IntField, StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { Field, InputType } from "@nestjs/graphql";
import { CreateLeadDto, CreateLeadPhoneNumberDto } from "@nextier/dto";

@InputType()
export class CreateLeadInput implements CreateLeadDto {
  @StringField({ nullable: true })
  firstName?: string;

  @StringField({ nullable: true })
  lastName?: string;

  @IntField({ defaultValue: 0 })
  score?: number;

  @StringField({ nullable: true })
  email?: MaybeString;

  @StringField({ nullable: true })
  phone?: MaybeString;

  @StringField({ nullable: true })
  title?: MaybeString;

  @StringField({ nullable: true })
  company?: MaybeString;

  @StringField({ nullable: true })
  zipCode?: MaybeString;

  @StringField({ nullable: true })
  country?: MaybeString;

  @StringField({ nullable: true })
  state?: MaybeString;

  @StringField({ nullable: true })
  city?: MaybeString;

  @StringField({ nullable: true })
  address?: MaybeString;

  @StringField({ nullable: true })
  source?: MaybeString;

  @StringField({ nullable: true })
  notes?: MaybeString;

  @StringField({ nullable: true })
  status?: MaybeString;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
export class UpdateLeadInput extends CreateLeadInput {}

@InputType()
export class CreateLeadPhoneNumberInput implements CreateLeadPhoneNumberDto {
  @StringField()
  phone: string;

  @StringField()
  label: string;
}

@InputType()
export class BulkCreateLeadsInput {
  @Field(() => [CreateLeadInput])
  leads: CreateLeadInput[];

  @StringField({ nullable: true })
  source?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}
