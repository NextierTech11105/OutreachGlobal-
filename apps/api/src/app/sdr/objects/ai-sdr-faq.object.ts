import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AiSdrFaq {
  @Field()
  question: string;

  @Field()
  answer: string;
}
