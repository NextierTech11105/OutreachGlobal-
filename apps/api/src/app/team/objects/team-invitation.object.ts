import { Field, ObjectType } from "@nestjs/graphql";
import {
  TeamInvitation,
  TeamInvitationSelect,
} from "../models/team-invitation.model";
import { Team, TeamSelect } from "../models/team.model";
import { IdField } from "@/app/apollo/decorators";

@ObjectType()
export class InviteTeamPayload {
  @Field(() => TeamInvitation)
  teamInvitation: TeamInvitationSelect;
}

@ObjectType()
export class CreateTeamAccountPayload {
  @Field(() => Team)
  team: TeamSelect;

  @Field()
  token: string;
}

@ObjectType()
export class ResendTeamInvitationPayload {
  @Field(() => TeamInvitation)
  teamInvitation: TeamInvitationSelect;
}

@ObjectType()
export class RemoveTeamInvitationPayload {
  @IdField()
  removedId: string;
}
