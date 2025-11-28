import { ObjectType, Field, Int } from "@nestjs/graphql";
import { InboxItem, InboxItemSelect } from "../models/inbox-item.model";
import { ResponseBucket, ResponseBucketSelect } from "../models/response-bucket.model";
import { SuppressionEntry, SuppressionEntrySelect } from "../models/suppression-entry.model";
import { StringField, IntField } from "@/app/apollo/decorators";
import { BucketType } from "@nextier/common";

@ObjectType()
export class ProcessInboxItemPayload {
  @Field(() => InboxItem)
  inboxItem: InboxItemSelect;
}

@ObjectType()
export class MoveInboxItemPayload {
  @Field(() => InboxItem)
  inboxItem: InboxItemSelect;
}

@ObjectType()
export class UpdateInboxItemPayload {
  @Field(() => InboxItem)
  inboxItem: InboxItemSelect;
}

@ObjectType()
export class BulkMoveInboxItemsPayload {
  @IntField()
  movedCount: number;
}

@ObjectType()
export class CreateSuppressionPayload {
  @Field(() => SuppressionEntry)
  suppressionEntry: SuppressionEntrySelect;
}

@ObjectType()
export class RemoveSuppressionPayload {
  @StringField()
  deletedSuppressionId: string;
}

@ObjectType()
export class CreateResponseBucketPayload {
  @Field(() => ResponseBucket)
  bucket: ResponseBucketSelect;
}

@ObjectType()
export class BucketStats {
  @StringField()
  bucket: BucketType;

  @StringField()
  name: string;

  @IntField()
  count: number;

  @IntField()
  unreadCount: number;

  @StringField({ nullable: true })
  color?: string;

  @StringField({ nullable: true })
  icon?: string;
}

@ObjectType()
export class InboxStats {
  @IntField()
  totalItems: number;

  @IntField()
  unreadCount: number;

  @IntField()
  requiresReviewCount: number;

  @IntField()
  processedToday: number;

  @Field(() => [BucketStats])
  bucketStats: BucketStats[];
}

@ObjectType()
export class InboxProcessingResult {
  @StringField()
  inboxItemId: string;

  @StringField()
  classification: string;

  @StringField()
  priority: string;

  @StringField({ nullable: true })
  assignedSdrId?: string;

  @StringField({ nullable: true })
  assignedSdrName?: string;

  @Field(() => Boolean)
  autoRespond: boolean;

  @StringField({ nullable: true })
  suggestedResponse?: string;
}
