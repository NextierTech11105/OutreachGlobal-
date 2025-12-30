import { TimestampModel } from "@/app/apollo/base-model";
import { DateField, StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { messagesTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject, MessageDirection, MessageType } from "@nextier/common";

export type MessageSelect = typeof messagesTable.$inferSelect;
export type MessageInsert = typeof messagesTable.$inferInsert;

@ObjectType()
export class Message extends TimestampModel implements MessageSelect {
  teamId: string;
  leadId: MaybeString;
  campaignId: MaybeString;
  externalId: MaybeString;

  @Field(() => String)
  type: MessageType;

  @Field(() => String)
  direction: MessageDirection;

  @Field()
  status: string;

  @StringField({ nullable: true })
  toName: MaybeString;

  @StringField({ nullable: true })
  toAddress: MaybeString;

  @StringField({ nullable: true })
  fromName: MaybeString;

  @StringField({ nullable: true })
  fromAddress: MaybeString;

  @StringField({ nullable: true })
  subject: MaybeString;

  @StringField({ nullable: true })
  body: MaybeString;

  metadata: AnyObject | null;

  @StringField({ nullable: true })
  outboundNumberId: MaybeString;

  @DateField({ nullable: true })
  deletedAt: Date | null;
}

@ObjectType()
export class MessageEdge extends WithEdge(Message) {}

@ObjectType()
export class MessageConnection extends WithConnection(MessageEdge) {}
