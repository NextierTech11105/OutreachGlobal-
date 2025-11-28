import { Field, ObjectType } from "@nestjs/graphql";
import { Message, MessageSelect } from "../models/message.model";

@ObjectType()
export class CreateMessagePayload {
  @Field(() => Message)
  message: MessageSelect;
}
