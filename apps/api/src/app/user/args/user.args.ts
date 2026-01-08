import { ArgsType, Field } from "@nestjs/graphql";
import { LoginInput } from "../inputs/login.input";
import { RegisterInput } from "../inputs/register.input";
import { UpdateProfileInput } from "../inputs/profile.input";

@ArgsType()
export class LoginArgs {
  @Field()
  input: LoginInput;
}

@ArgsType()
export class RegisterArgs {
  @Field()
  input: RegisterInput;
}

@ArgsType()
export class UpdateProfileArgs {
  @Field()
  input: UpdateProfileInput;
}
