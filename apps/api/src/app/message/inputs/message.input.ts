import { StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { InputType } from "@nestjs/graphql";
import { CreateMessageDto } from "@nextier/dto";

@InputType()
export class CreateMessageInput implements CreateMessageDto {
  @StringField({ nullable: true })
  toName: MaybeString;

  @StringField()
  toAddress: string;

  @StringField({ nullable: true })
  subject: MaybeString;

  @StringField()
  body: string;
}
