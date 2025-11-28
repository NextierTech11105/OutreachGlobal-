import { StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { Field, InputType } from "@nestjs/graphql";
import { AiSdrAvatarDto } from "@nextier/dto";

@InputType()
class AiSdrFaqInput {
  @Field()
  question: string;

  @Field()
  answer: string;
}

@InputType({ isAbstract: true })
export class AiSdrAvatarInput implements AiSdrAvatarDto {
  @Field()
  name: string;

  @StringField({ nullable: true })
  description?: MaybeString;

  @Field()
  personality: string;

  @Field()
  voiceType: string;

  @StringField({ nullable: true })
  avatarUri?: MaybeString;

  @Field(() => Boolean, { defaultValue: true })
  active: boolean;

  @Field()
  industry: string;

  @Field()
  mission: string;

  @Field()
  goal: string;

  @Field(() => [String])
  roles: string[];

  @Field(() => [AiSdrFaqInput])
  faqs: AiSdrFaqInput[];

  @Field(() => [String])
  tags: string[];
}

@InputType()
export class CreateAiSdrAvatarInput extends AiSdrAvatarInput {}

@InputType()
export class UpdateAiSdrAvatarInput extends AiSdrAvatarInput {}
