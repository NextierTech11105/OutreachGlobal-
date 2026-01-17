import { Field, ObjectType } from "@nestjs/graphql";
import { User, UserSelect } from "../models/user.model";
import { Team, TeamSelect } from "@/app/team/models/team.model";

@ObjectType()
export class LoginPayload {
  @Field(() => User)
  user: UserSelect;

  @Field()
  token: string;
}

@ObjectType()
export class RegisterPayload {
  @Field(() => User)
  user: UserSelect;

  @Field(() => Team)
  team: TeamSelect;

  @Field()
  token: string;
}

@ObjectType()
export class UpdateProfilePayload {
  @Field(() => User)
  user: UserSelect;
}

@ObjectType()
export class OAuthLoginPayload {
  @Field(() => User)
  user: UserSelect;

  @Field(() => Team)
  team: TeamSelect;

  @Field()
  token: string;
}
