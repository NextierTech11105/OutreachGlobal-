import { Field, ObjectType } from "@nestjs/graphql";
import { User, UserSelect } from "../models/user.model";

@ObjectType()
export class LoginPayload {
  @Field(() => User)
  user: UserSelect;

  @Field()
  token: string;
}

@ObjectType()
export class UpdateProfilePayload {
  @Field(() => User)
  user: UserSelect;
}
