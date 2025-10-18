import { DateField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType } from "@nestjs/graphql";

@ArgsType()
export class CallCenterReportArgs extends BaseTeamArgs {
  @DateField({ nullable: true })
  startDate?: Date;

  @DateField({ nullable: true })
  endDate?: Date;
}
