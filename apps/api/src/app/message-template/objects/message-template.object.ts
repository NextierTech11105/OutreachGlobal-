import { Field, ObjectType } from "@nestjs/graphql";
import {
  MessageTemplate,
  MessageTemplateSelect,
} from "../models/message-template.model";
import { IdField } from "@/app/apollo/decorators";

@ObjectType()
export class CreateMessageTemplatePayload {
  @Field(() => MessageTemplate)
  messageTemplate: MessageTemplateSelect;
}

@ObjectType()
export class UpdateMessageTemplatePayload {
  @Field(() => MessageTemplate)
  messageTemplate: MessageTemplateSelect;
}

@ObjectType()
export class DeleteMessageTemplatePayload {
  @IdField()
  deletedMessageTemplateId: string;
}

@ObjectType()
export class GenerateMessageTemplatePayload {
  @Field()
  content: string;
}
