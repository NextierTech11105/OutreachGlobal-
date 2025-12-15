import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { Field, InputType } from "@nestjs/graphql";
import {
  ContentItemType,
  ContentVisibility,
  ContentVariable,
} from "@nextier/common";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";

@InputType()
export class ContentVariableInput {
  @StringField()
  name: string;

  @StringField({ nullable: true })
  description?: string;

  @BooleanField({ nullable: true })
  required?: boolean;

  @StringField({ nullable: true })
  defaultValue?: string;
}

@InputType()
export class CreateContentItemInput {
  @StringField({ nullable: true })
  categoryId?: MaybeString;

  @StringField()
  title: string;

  @StringField()
  content: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @Field(() => ContentItemType, { nullable: true })
  contentType?: ContentItemType;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [ContentVariableInput], { nullable: true })
  variables?: ContentVariableInput[];

  @Field(() => ContentVisibility, { nullable: true })
  visibility?: ContentVisibility;
}

@InputType()
export class UpdateContentItemInput {
  @StringField({ nullable: true })
  categoryId?: MaybeString;

  @StringField({ nullable: true })
  title?: string;

  @StringField({ nullable: true })
  content?: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @Field(() => ContentItemType, { nullable: true })
  contentType?: ContentItemType;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [ContentVariableInput], { nullable: true })
  variables?: ContentVariableInput[];

  @Field(() => ContentVisibility, { nullable: true })
  visibility?: ContentVisibility;

  @BooleanField({ nullable: true })
  isActive?: boolean;

  @BooleanField({ nullable: true })
  isFavorite?: boolean;
}
