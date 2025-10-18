import { ArgsType, Field } from "@nestjs/graphql";
import { BaseTeamArgs } from "./team.args";
import { BusinessListSettingsInput } from "../inputs/business-list-settings.input";

@ArgsType()
export class UpsertBusinessListSettingsArgs extends BaseTeamArgs {
  @Field(() => BusinessListSettingsInput)
  input: BusinessListSettingsInput;
}
