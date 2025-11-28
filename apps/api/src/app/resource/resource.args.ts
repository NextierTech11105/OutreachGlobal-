import { ArgsType, Field } from "@nestjs/graphql";
import { BaseTeamArgs } from "../team/args/team.args";
import { StringField } from "../apollo/decorators";

@ArgsType()
export class ResourceConnectionArgs extends BaseTeamArgs {
  @Field()
  type: string;

  @StringField({ nullable: true })
  search?: string;
}
