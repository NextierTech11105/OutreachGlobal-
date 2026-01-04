import { Field, ObjectType } from "@nestjs/graphql";
import { StringField } from "@/app/apollo/decorators";

@ObjectType()
export class SignalHouseSettings {
  @StringField({ nullable: true })
  subGroupId: string | null;

  @StringField({ nullable: true })
  brandId: string | null;

  @Field(() => [String], { nullable: true })
  campaignIds: string[] | null;

  @Field(() => [String], { nullable: true })
  phonePool: string[] | null;
}

@ObjectType()
export class UpdateSignalHouseSettingsPayload {
  @Field(() => SignalHouseSettings)
  settings: SignalHouseSettings;
}
