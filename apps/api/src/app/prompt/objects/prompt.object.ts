import { Field, ObjectType } from "@nestjs/graphql";
import { Prompt } from "../models/prompt.model";

@ObjectType()
export class CreatePromptPayload {
  @Field(() => Prompt)
  prompt: Prompt;
}

@ObjectType()
export class UpdatePromptPayload {
  @Field(() => Prompt)
  prompt: Prompt;
}

@ObjectType()
export class DeletePromptPayload {
  @Field()
  deletedPromptId: string;
}

@ObjectType()
export class BulkDeletePromptPayload {
  @Field()
  deletedPromptsCount: number;
}
