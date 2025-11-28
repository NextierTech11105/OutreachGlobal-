import { ArgsType, Field } from "@nestjs/graphql";
import { IntegrationFieldInput } from "../inputs/integration-field.input";
import { IdField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";

@ArgsType()
export class FindIntegrationFieldsArgs extends BaseTeamArgs {
  @IdField()
  integrationId: string;

  @Field()
  moduleName: string;
}

@ArgsType()
export class UpsertIntegrationFieldsArgs {
  @IdField()
  teamId: string;

  @IdField()
  integrationId: string;

  @Field()
  moduleName: string;

  @Field(() => [IntegrationFieldInput])
  fields: IntegrationFieldInput[];
}
