import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import {
  CreateMessageTemplateInput,
  UpdateMessageTemplateInput,
} from "../inputs/message-template.input";
import { MessageTemplateType } from "@nextier/common";

@ArgsType()
export class MessageTemplateConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @Field(() => [MessageTemplateType], { nullable: true })
  types?: MessageTemplateType[];
}

@ArgsType()
export class FindOneMessageTemplateArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateMessageTemplateArgs extends BaseTeamArgs {
  @Field(() => MessageTemplateType)
  type: MessageTemplateType;

  @Field()
  input: CreateMessageTemplateInput;
}

@ArgsType()
export class UpdateMessageTemplateArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field(() => MessageTemplateType)
  type: MessageTemplateType;

  @Field()
  input: UpdateMessageTemplateInput;
}

@ArgsType()
export class DeleteMessageTemplateArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class GenerateMessageTemplateArgs extends BaseTeamArgs {
  @Field()
  prompt: string;
}
