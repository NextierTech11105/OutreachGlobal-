import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { initialMessagesTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject, InitialMessageCategory, MessageTone } from "@nextier/common";

export type InitialMessageSelect = typeof initialMessagesTable.$inferSelect;
export type InitialMessageInsert = typeof initialMessagesTable.$inferInsert;

@ObjectType()
export class InitialMessage extends TimestampModel implements InitialMessageSelect {
  teamId: string;

  @StringField()
  name: string;

  @StringField({ nullable: true })
  description: MaybeString;

  @StringField()
  content: string;

  @StringField()
  category: InitialMessageCategory;

  @StringField()
  tone: MessageTone;

  @Field(() => [String], { nullable: true })
  tags: Maybe<string[]>;

  @StringField({ nullable: true })
  defaultSdrId: MaybeString;

  @IntField()
  timesUsed: number;

  @IntField({ nullable: true })
  responseRate: Maybe<number>;

  @IntField({ nullable: true })
  positiveResponseRate: Maybe<number>;

  @IntField({ nullable: true })
  avgResponseTime: Maybe<number>;

  @Field(() => [String], { nullable: true })
  availableTokens: Maybe<string[]>;

  @BooleanField({ nullable: true })
  isVariant: Maybe<boolean>;

  @StringField({ nullable: true })
  parentMessageId: MaybeString;

  @StringField({ nullable: true })
  variantName: MaybeString;

  @BooleanField({ nullable: true })
  isActive: Maybe<boolean>;

  @BooleanField({ nullable: true })
  isArchived: Maybe<boolean>;

  metadata: Maybe<AnyObject>;
}

@ObjectType()
export class InitialMessageEdge extends WithEdge(InitialMessage) {}

@ObjectType()
export class InitialMessageConnection extends WithConnection(InitialMessageEdge) {}
