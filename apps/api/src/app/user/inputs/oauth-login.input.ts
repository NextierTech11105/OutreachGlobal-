import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class OAuthLoginInput {
  @Field()
  email: string;

  @Field()
  provider: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  googleId?: string;
}
