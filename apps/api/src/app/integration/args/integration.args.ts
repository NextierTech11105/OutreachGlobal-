import { IdField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";

@ArgsType()
export class ConnectIntegrationArgs extends BaseTeamArgs {
  @Field({ description: "ZOHO only for now" })
  provider: string;
}

@ArgsType()
export class FindOneIntegrationArgs extends BaseTeamArgs {
  @Field({ description: "id or name" })
  id: string;
}

@ArgsType()
export class SyncIntegrationLeadArgs extends BaseTeamArgs {
  @IdField({ description: "integration id" })
  id: string;

  @Field({ description: "crm module name" })
  moduleName: string;
}
