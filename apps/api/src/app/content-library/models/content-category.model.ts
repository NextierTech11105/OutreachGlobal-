import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { contentCategoriesTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type ContentCategorySelect = typeof contentCategoriesTable.$inferSelect;
export type ContentCategoryInsert = typeof contentCategoriesTable.$inferInsert;

@ObjectType()
export class ContentCategory
  extends TimestampModel
  implements ContentCategorySelect
{
  teamId: MaybeString;

  @StringField()
  name: string;

  @StringField()
  slug: string;

  @StringField({ nullable: true })
  description: MaybeString;

  @StringField({ nullable: true })
  icon: MaybeString;

  @StringField({ nullable: true })
  color: MaybeString;

  @StringField({ nullable: true })
  parentId: MaybeString;

  @IntField({ nullable: true })
  sortOrder: Maybe<number>;

  @BooleanField({ nullable: true })
  isSystem: Maybe<boolean>;

  // Resolved fields
  @Field(() => ContentCategory, { nullable: true })
  parent?: ContentCategory;

  @Field(() => [ContentCategory], { nullable: true })
  children?: ContentCategory[];

  @IntField({ nullable: true })
  itemCount?: number;
}

@ObjectType()
export class ContentCategoryEdge extends WithEdge(ContentCategory) {}

@ObjectType()
export class ContentCategoryConnection extends WithConnection(
  ContentCategoryEdge,
) {}
