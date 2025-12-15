import { ObjectType, Field } from "@nestjs/graphql";
import {
  ContentCategory,
  ContentCategorySelect,
} from "../models/content-category.model";
import { StringField } from "@/app/apollo/decorators";

@ObjectType()
export class CreateContentCategoryPayload {
  @Field(() => ContentCategory)
  category: ContentCategorySelect;
}

@ObjectType()
export class UpdateContentCategoryPayload {
  @Field(() => ContentCategory)
  category: ContentCategorySelect;
}

@ObjectType()
export class DeleteContentCategoryPayload {
  @StringField()
  deletedCategoryId: string;
}
