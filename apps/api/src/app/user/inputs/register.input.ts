import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class RegisterInput {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  companyName: string;

  @Field()
  password: string;
}
