import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { integrationFieldsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type IntegrationFieldSelect = typeof integrationFieldsTable.$inferSelect;
export type IntegrationFieldInsert = typeof integrationFieldsTable.$inferInsert;

@ObjectType()
export class IntegrationField
  extends TimestampModel
  implements IntegrationFieldSelect
{
  integrationId: string;

  @Field()
  moduleName: string;

  @Field()
  sourceField: string;

  @Field()
  targetField: string;

  @StringField({
    nullable: true,
    description:
      "the sub field of target field if field is a lookup or non primitive value",
  })
  subField: MaybeString;

  // Skipping GraphQL Field decorator for metadata as requested
  metadata: AnyObject | null;
}
