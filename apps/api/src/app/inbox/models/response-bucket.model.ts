import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField, JSONField } from "@/app/apollo/decorators";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { responseBucketsTable } from "@/database/schema-alias";
import { ObjectType } from "@nestjs/graphql";
import { AnyObject, BucketType } from "@nextier/common";

export type ResponseBucketSelect = typeof responseBucketsTable.$inferSelect;
export type ResponseBucketInsert = typeof responseBucketsTable.$inferInsert;

@ObjectType()
export class ResponseBucket extends TimestampModel implements ResponseBucketSelect {
  teamId: string;

  @StringField()
  type: BucketType;

  @StringField()
  name: string;

  @StringField({ nullable: true })
  description: MaybeString;

  @StringField({ nullable: true })
  color: MaybeString;

  @StringField({ nullable: true })
  icon: MaybeString;

  @IntField()
  position: number;

  @BooleanField({ nullable: true })
  isSystem: Maybe<boolean>;

  @JSONField({ nullable: true })
  autoMoveRules: Maybe<AnyObject>;
}
