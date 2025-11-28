import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import { CreateCallHistoryInput } from "../inputs/call-history.input";

@ArgsType()
export class CallHistoryConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @IdField({ nullable: true })
  powerDialerId?: string;
}

@ArgsType()
export class CreateCallHistoryArgs extends BaseTeamArgs {
  @IdField()
  powerDialerId: string;

  @IdField()
  dialerContactId: string;

  @Field({ defaultValue: false })
  markAsCompleted: boolean;

  @Field()
  input: CreateCallHistoryInput;
}
