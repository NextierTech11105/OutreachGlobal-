import { IdField } from "@/app/apollo/decorators";
import { ArgsType } from "@nestjs/graphql";

@ArgsType()
export class BaseTeamArgs {
  @IdField({ description: "team id or team slug" })
  teamId: string;
}

@ArgsType()
export class FindOneTeamArgs {
  @IdField({ description: "team id or team slug" })
  id: string;
}

@ArgsType()
export class TeamReportArgs {
  @IdField({ description: "team id or team slug" })
  teamId: string;
}
