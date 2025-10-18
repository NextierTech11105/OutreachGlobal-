import { StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { Field, InputType } from "@nestjs/graphql";
import { PromptCategory, PromptType } from "@nextier/common";
import { CreatePromptDto } from "@nextier/dto";

@InputType()
export class CreatePromptInput implements CreatePromptDto {
  @Field()
  name: string;

  @Field(() => String)
  type: PromptType;

  @Field(() => String)
  category: PromptCategory;

  @StringField({ nullable: true })
  description?: MaybeString;

  @Field()
  content: string;

  @Field(() => [String], { defaultValue: [] })
  tags: string[];
}

@InputType()
export class UpdatePromptInput extends CreatePromptInput {}
