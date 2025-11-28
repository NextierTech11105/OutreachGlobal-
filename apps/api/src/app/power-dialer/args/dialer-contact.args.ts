import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field, ID } from "@nestjs/graphql";

@ArgsType()
export class DialerContactConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @IdField()
  powerDialerId: string;
}

@ArgsType()
export class UpsertDialerContactArgs extends BaseTeamArgs {
  @IdField()
  powerDialerId: string;

  @Field(() => [ID])
  leadIds: string[];
}
