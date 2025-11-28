import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { InputType, registerEnumType } from "@nestjs/graphql";
import { BucketType, InboxPriority, ResponseClassification, SuppressionType } from "@nextier/common";

// Register enums for GraphQL
registerEnumType(ResponseClassification, { name: "ResponseClassification" });
registerEnumType(InboxPriority, { name: "InboxPriority" });
registerEnumType(BucketType, { name: "BucketType" });
registerEnumType(SuppressionType, { name: "SuppressionType" });

@InputType()
export class ProcessInboxItemInput {
  @StringField({ nullable: true })
  classification?: ResponseClassification;

  @StringField({ nullable: true })
  targetBucket?: BucketType;

  @StringField({ nullable: true })
  notes?: MaybeString;

  @BooleanField({ nullable: true })
  markAsProcessed?: boolean;
}

@InputType()
export class MoveInboxItemInput {
  @StringField()
  targetBucket: BucketType;

  @StringField({ nullable: true })
  reason?: MaybeString;
}

@InputType()
export class CreateSuppressionInput {
  @StringField()
  phoneNumber: string;

  @StringField()
  type: SuppressionType;

  @StringField({ nullable: true })
  reason?: MaybeString;

  @StringField({ nullable: true })
  sourceInboxItemId?: MaybeString;
}

@InputType()
export class UpdateInboxItemInput {
  @BooleanField({ nullable: true })
  isRead?: boolean;

  @BooleanField({ nullable: true })
  isStarred?: boolean;

  @StringField({ nullable: true })
  aiNotes?: MaybeString;
}

@InputType()
export class CreateResponseBucketInput {
  @StringField()
  type: BucketType;

  @StringField()
  name: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @StringField({ nullable: true })
  color?: MaybeString;

  @StringField({ nullable: true })
  icon?: MaybeString;

  @IntField({ nullable: true })
  position?: number;
}
