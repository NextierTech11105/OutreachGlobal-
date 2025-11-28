import { TimestampModel } from "@/app/apollo/base-model";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { teamMembersTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type TeamMemberSelect = typeof teamMembersTable.$inferSelect;
export type TeamMemberInsert = typeof teamMembersTable.$inferInsert;

@ObjectType()
export class TeamMember extends TimestampModel implements TeamMemberSelect {
  teamId: string;
  userId: MaybeString;

  @Field()
  role: string;

  @Field()
  status: string;
}

@ObjectType()
export class TeamMemberEdge extends WithEdge(TeamMember) {}

@ObjectType()
export class TeamMemberConnection extends WithConnection(TeamMemberEdge) {}
