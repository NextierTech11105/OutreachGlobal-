import { TimestampModel } from "@/app/apollo/base-model";
import {
  IntField,
  StringField,
  BooleanField,
  DateField,
} from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { contentItemsTable } from "@/database/schema-alias";
import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import {
  ContentItemType,
  ContentVisibility,
  ContentVariable,
  AnyObject,
} from "@nextier/common";
import { ContentCategory } from "./content-category.model";

// Register enums for GraphQL
registerEnumType(ContentItemType, { name: "ContentItemType" });
registerEnumType(ContentVisibility, { name: "ContentVisibility" });

export type ContentItemSelect = typeof contentItemsTable.$inferSelect;
export type ContentItemInsert = typeof contentItemsTable.$inferInsert;

@ObjectType()
export class ContentVariableType {
  @StringField()
  name: string;

  @StringField({ nullable: true })
  description?: string;

  @BooleanField({ nullable: true })
  required?: boolean;

  @StringField({ nullable: true })
  defaultValue?: string;
}

@ObjectType()
export class ContentItem extends TimestampModel implements ContentItemSelect {
  teamId: MaybeString;
  categoryId: MaybeString;
  createdById: MaybeString;

  @StringField()
  title: string;

  @StringField()
  content: string;

  @StringField({ nullable: true })
  description: MaybeString;

  @Field(() => ContentItemType)
  contentType: ContentItemType;

  @Field(() => [String], { nullable: true })
  tags: Maybe<string[]>;

  @StringField({ nullable: true })
  externalUrl: MaybeString;

  @Field(() => [ContentVariableType], { nullable: true })
  variables: Maybe<ContentVariable[]>;

  @IntField({ nullable: true })
  usageCount: Maybe<number>;

  @DateField({ nullable: true })
  lastUsedAt: Maybe<Date>;

  @Field(() => ContentVisibility, { nullable: true })
  visibility: Maybe<ContentVisibility>;

  @BooleanField({ nullable: true })
  isActive: Maybe<boolean>;

  @BooleanField({ nullable: true })
  isFavorite: Maybe<boolean>;

  metadata: Maybe<AnyObject>;

  // Resolved fields
  @Field(() => ContentCategory, { nullable: true })
  category?: ContentCategory;
}

@ObjectType()
export class ContentItemEdge extends WithEdge(ContentItem) {}

@ObjectType()
export class ContentItemConnection extends WithConnection(ContentItemEdge) {}
