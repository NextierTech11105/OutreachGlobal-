import { Field, InputType } from "@nestjs/graphql";
import { StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";

@InputType()
export class SignalHouseSettingsInput {
  @StringField({ nullable: true })
  subGroupId?: MaybeString;

  @StringField({ nullable: true })
  brandId?: MaybeString;

  @Field(() => [String], { nullable: true })
  campaignIds?: string[];

  @Field(() => [String], { nullable: true })
  phonePool?: string[];
}
