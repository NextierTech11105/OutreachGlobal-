import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField } from "@/app/apollo/decorators";
import { ArgsType } from "@nestjs/graphql";
import { BaseTeamArgs } from "./team.args";

@ArgsType()
export class TeamMemberConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;
}

@ArgsType()
export class RemoveTeamMemberArgs extends BaseTeamArgs {
  @IdField()
  memberId: string;
}
