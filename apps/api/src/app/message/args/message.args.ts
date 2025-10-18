import { IdField, StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import { CreateMessageInput } from "../inputs/message.input";
import { MessageType } from "@nextier/common";
import { PageInfoArgs } from "@/app/apollo/args/page-info.args";

@ArgsType()
export class MessageConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  direction?: string;
}

@ArgsType()
export class CreateMessageArgs extends BaseTeamArgs {
  @IdField({ nullable: true })
  leadId?: MaybeString;

  @Field(() => String)
  type: MessageType;

  @Field()
  input: CreateMessageInput;
}
