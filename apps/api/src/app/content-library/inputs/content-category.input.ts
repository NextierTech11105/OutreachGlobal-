import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { InputType } from "@nestjs/graphql";

@InputType()
export class CreateContentCategoryInput {
  @StringField()
  name: string;

  @StringField()
  slug: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @StringField({ nullable: true })
  icon?: MaybeString;

  @StringField({ nullable: true })
  color?: MaybeString;

  @StringField({ nullable: true })
  parentId?: MaybeString;

  @IntField({ nullable: true })
  sortOrder?: number;
}

@InputType()
export class UpdateContentCategoryInput {
  @StringField({ nullable: true })
  name?: string;

  @StringField({ nullable: true })
  slug?: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @StringField({ nullable: true })
  icon?: MaybeString;

  @StringField({ nullable: true })
  color?: MaybeString;

  @StringField({ nullable: true })
  parentId?: MaybeString;

  @IntField({ nullable: true })
  sortOrder?: number;
}
