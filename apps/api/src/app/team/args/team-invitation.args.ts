import { Args, ArgsType, Field } from "@nestjs/graphql";
import { BaseTeamArgs } from "./team.args";
import {
  CreateTeamAccountInput,
  InviteTeamMemberInput,
} from "../inputs/team-invitation.input";
import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField } from "@/app/apollo/decorators";

@ArgsType()
export class TeamInvitationConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;
}

@ArgsType()
export class InviteTeamMemberArgs extends BaseTeamArgs {
  @Field()
  input: InviteTeamMemberInput;
}

@ArgsType()
export class TeamInvitationByCodeArgs {
  @Field()
  code: string;
}

@ArgsType()
export class CreateTeamAccountArgs {
  @Field()
  code: string;

  @Field()
  input: CreateTeamAccountInput;
}

@ArgsType()
export class ResendTeamInvitationArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class RemoveInvitationArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}
