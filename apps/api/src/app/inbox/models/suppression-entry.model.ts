import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { suppressionListTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject, SuppressionType } from "@nextier/common";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";

export type SuppressionEntrySelect = typeof suppressionListTable.$inferSelect;
export type SuppressionEntryInsert = typeof suppressionListTable.$inferInsert;

@ObjectType()
export class SuppressionEntry
  extends TimestampModel
  implements SuppressionEntrySelect
{
  teamId: string;

  @StringField()
  phoneNumber: string;

  @StringField()
  type: SuppressionType;

  @StringField({ nullable: true })
  reason: MaybeString;

  @StringField({ nullable: true })
  sourceInboxItemId: MaybeString;

  @Field(() => Date, { nullable: true })
  confirmedAt: Maybe<Date>;

  @StringField({ nullable: true })
  confirmedBy: MaybeString;

  @Field(() => Date, { nullable: true })
  expiresAt: Maybe<Date>;

  metadata: Maybe<AnyObject>;
}

@ObjectType()
export class SuppressionEntryEdge extends WithEdge(SuppressionEntry) {}

@ObjectType()
export class SuppressionEntryConnection extends WithConnection(
  SuppressionEntryEdge,
) {}
