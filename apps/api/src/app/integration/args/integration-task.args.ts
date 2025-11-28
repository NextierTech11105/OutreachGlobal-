import { IdField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";

@ArgsType()
export class IntegrationTaskConnectionArgs extends BaseTeamArgs {
  @IdField()
  integrationId: string;

  @Field({ nullable: true })
  moduleName?: string;
}
