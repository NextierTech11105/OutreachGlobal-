import { Field, InputType } from "@nestjs/graphql";
import type { LoginDto } from "@nextier/dto";

@InputType()
export class LoginInput implements LoginDto {
  @Field()
  email: string;

  @Field()
  password: string;
}
