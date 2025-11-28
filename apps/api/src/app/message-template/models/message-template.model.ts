import { TimestampModel } from "@/app/apollo/base-model";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { messageTemplatesTable } from "@/database/schema-alias";
import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { MessageTemplateType } from "@nextier/common";

export type MessageTemplateSelect = typeof messageTemplatesTable.$inferSelect;
export type MessageTemplateInsert = typeof messageTemplatesTable.$inferInsert;

registerEnumType(MessageTemplateType, {
  name: "MessageTemplateType",
});

@ObjectType()
export class MessageTemplate
  extends TimestampModel
  implements MessageTemplateSelect
{
  teamId: string;

  @Field(() => MessageTemplateType)
  type: MessageTemplateType;

  @Field()
  name: string;

  @Field(() => JSONScalar)
  data: Record<string, any>;
}

@ObjectType()
export class MessageTemplateEdge extends WithEdge(MessageTemplate) {}

@ObjectType()
export class MessageTemplateConnection extends WithConnection(
  MessageTemplateEdge,
) {}
