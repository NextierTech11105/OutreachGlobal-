import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import { ImportLeadPresetInput } from "../inputs/import-lead-preset.input";

@ArgsType()
export class CreateImportLeadPresetArgs extends BaseTeamArgs {
  @Field()
  input: ImportLeadPresetInput;
}

@ArgsType()
export class FindManyImportLeadPresetArgs extends BaseTeamArgs {}
