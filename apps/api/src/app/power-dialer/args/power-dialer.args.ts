import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import { CreatePowerDialerInput } from "../inputs/power-dialer.input";

@ArgsType()
export class PowerDialerConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;
}

@ArgsType()
export class CreatePowerDialerArgs extends BaseTeamArgs {
  @Field()
  input: CreatePowerDialerInput;
}

@ArgsType()
export class FindOnePowerDialerArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}
