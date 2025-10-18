import { TimestampModel } from "@/app/apollo/base-model";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { dialerContactsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type DialerContactSelect = typeof dialerContactsTable.$inferSelect;
export type DialerContactInsert = typeof dialerContactsTable.$inferInsert;

@ObjectType()
export class DialerContact
  extends TimestampModel
  implements DialerContactSelect
{
  powerDialerId: string;
  leadId: string;

  @Field()
  position: number;

  @Field()
  status: string;
}

@ObjectType()
export class DialerContactEdge extends WithEdge(DialerContact) {}

@ObjectType()
export class DialerContactConnection extends WithConnection(
  DialerContactEdge,
) {}
