import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";

@ArgsType()
export class FindOneModuleMetadataArgs extends BaseTeamArgs {
  @Field()
  provider: string;

  @Field()
  name: string;
}
