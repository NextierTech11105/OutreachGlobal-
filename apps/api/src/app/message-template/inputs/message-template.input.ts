import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { Field, InputType } from "@nestjs/graphql";

@InputType({ isAbstract: true })
export class MessageTemplateInput {
  @Field()
  name: string;

  @Field(() => JSONScalar)
  data: Record<string, any>;
}

@InputType()
export class CreateMessageTemplateInput extends MessageTemplateInput {}

@InputType()
export class UpdateMessageTemplateInput extends MessageTemplateInput {}
