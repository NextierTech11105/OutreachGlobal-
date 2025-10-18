import { TimestampModel } from "@/app/apollo/base-model";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { powerDialersTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type PowerDialerSelect = typeof powerDialersTable.$inferSelect;
export type PowerDialerInsert = typeof powerDialersTable.$inferInsert;

@ObjectType()
export class PowerDialer extends TimestampModel implements PowerDialerSelect {
  teamId: string;
  memberId: MaybeString;

  @Field()
  title: string;
}

@ObjectType()
export class PowerDialerEdge extends WithEdge(PowerDialer) {}

@ObjectType()
export class PowerDialerConnection extends WithConnection(PowerDialerEdge) {}
