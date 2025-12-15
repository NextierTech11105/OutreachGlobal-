import { ObjectType, Field } from "@nestjs/graphql";
import { ContentItem, ContentItemSelect } from "../models/content-item.model";
import { StringField, IntField, BooleanField } from "@/app/apollo/decorators";

@ObjectType()
export class CreateContentItemPayload {
  @Field(() => ContentItem)
  contentItem: ContentItemSelect;
}

@ObjectType()
export class UpdateContentItemPayload {
  @Field(() => ContentItem)
  contentItem: ContentItemSelect;
}

@ObjectType()
export class DeleteContentItemPayload {
  @StringField()
  deletedContentItemId: string;
}

@ObjectType()
export class UseContentItemPayload {
  @BooleanField()
  success: boolean;

  @IntField()
  newUsageCount: number;
}

@ObjectType()
export class ContentLibraryStats {
  @IntField()
  totalItems: number;

  @IntField()
  totalCategories: number;

  @IntField()
  totalUsageToday: number;

  @IntField()
  totalUsageThisMonth: number;
}
