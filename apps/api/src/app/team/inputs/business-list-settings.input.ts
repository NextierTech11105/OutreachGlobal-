import { InputType } from "@nestjs/graphql";
import { StringField } from "@/app/apollo/decorators";

@InputType()
export class BusinessListSettingsInput {
  @StringField({ nullable: true })
  businessListApiToken?: string;
}
