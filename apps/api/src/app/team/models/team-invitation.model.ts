import { TimestampModel } from "@/app/apollo/base-model";
import { DateField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { teamInvitationsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type TeamInvitationSelect = typeof teamInvitationsTable.$inferSelect;
export type TeamInvitationInsert = typeof teamInvitationsTable.$inferInsert;

@ObjectType()
export class TeamInvitation
  extends TimestampModel
  implements TeamInvitationSelect
{
  teamId: string;

  @Field()
  email: string;

  invitedBy: MaybeString;

  @Field(() => String)
  role: string;

  @DateField()
  expiresAt: Date;
}

@ObjectType()
export class TeamInvitationEdge extends WithEdge(TeamInvitation) {}

@ObjectType()
export class TeamInvitationConnection extends WithConnection(
  TeamInvitationEdge,
) {}
