import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { inboxItemsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import {
  AnyObject,
  BucketType,
  InboxPriority,
  ResponseClassification,
} from "@nextier/common";

export type InboxItemSelect = typeof inboxItemsTable.$inferSelect;
export type InboxItemInsert = typeof inboxItemsTable.$inferInsert;

@ObjectType()
export class InboxItem extends TimestampModel implements InboxItemSelect {
  teamId: string;

  @StringField({ nullable: true })
  leadId: MaybeString;

  @StringField({ nullable: true })
  messageId: MaybeString;

  @StringField({ nullable: true })
  campaignId: MaybeString;

  @StringField({ nullable: true })
  assignedSdrId: MaybeString;

  @StringField()
  classification: ResponseClassification;

  @IntField({ nullable: true })
  classificationConfidence: Maybe<number>;

  @Field(() => Date, { nullable: true })
  classifiedAt: Maybe<Date>;

  @StringField({ nullable: true })
  classifiedBy: MaybeString;

  @StringField({ nullable: true })
  priority: Maybe<InboxPriority>;

  @IntField()
  priorityScore: number;

  @StringField({ nullable: true })
  currentBucket: Maybe<BucketType>;

  @StringField({ nullable: true })
  responseText: MaybeString;

  @StringField({ nullable: true })
  phoneNumber: MaybeString;

  @BooleanField({ nullable: true })
  isRead: Maybe<boolean>;

  @BooleanField({ nullable: true })
  isStarred: Maybe<boolean>;

  @BooleanField({ nullable: true })
  requiresReview: Maybe<boolean>;

  @BooleanField({ nullable: true })
  isProcessed: Maybe<boolean>;

  @StringField({ nullable: true })
  sentiment: MaybeString;

  @StringField({ nullable: true })
  intent: MaybeString;

  @StringField({ nullable: true })
  suggestedAction: MaybeString;

  @StringField({ nullable: true })
  aiNotes: MaybeString;

  @Field(() => Date, { nullable: true })
  processedAt: Maybe<Date>;

  @StringField({ nullable: true })
  processedBy: MaybeString;

  @Field(() => Date, { nullable: true })
  dueAt: Maybe<Date>;

  @Field(() => Date, { nullable: true })
  escalatedAt: Maybe<Date>;

  @IntField({ nullable: true })
  escalationLevel: Maybe<number>;

  metadata: Maybe<AnyObject>;
}

@ObjectType()
export class InboxItemEdge extends WithEdge(InboxItem) {}

@ObjectType()
export class InboxItemConnection extends WithConnection(InboxItemEdge) {}
