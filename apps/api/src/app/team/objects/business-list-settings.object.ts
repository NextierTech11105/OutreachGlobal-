import { IdField, StringField } from "@/app/apollo/decorators";
import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class BusinessListSettings {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  businessListApiToken?: string;
}

@ObjectType()
export class UpsertBusinessListSettingsPayload {
  @Field(() => BusinessListSettings)
  settings: BusinessListSettings;
}
