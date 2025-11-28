import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { callHistoriesTable } from "@/database/schema-alias";
import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { AnyObject, DialerMode } from "@nextier/common";

export type CallHistorySelect = typeof callHistoriesTable.$inferSelect;
export type CallHistoryInsert = typeof callHistoriesTable.$inferInsert;

registerEnumType(DialerMode, {
  name: "DialerMode",
});

@ObjectType()
export class CallHistory extends TimestampModel implements CallHistorySelect {
  powerDialerId: string;
  dialerContactId: string;
  teamMemberId: string | null;
  aiSdrAvatarId: string | null;

  @StringField({ nullable: true })
  notes: MaybeString;

  @StringField({ nullable: true })
  sid: MaybeString;

  @Field()
  dialerMode: DialerMode;

  @StringField({ nullable: true })
  disposition: MaybeString;

  @IntField()
  duration: number;

  sentiment: AnyObject;
}

@ObjectType()
export class CallHistoryEdge extends WithEdge(CallHistory) {}

@ObjectType()
export class CallHistoryConnection extends WithConnection(CallHistoryEdge) {}
