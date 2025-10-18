import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { User } from "../models/user.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { LoginPayload, UpdateProfilePayload } from "../objects/user.object";
import { LoginArgs, UpdateProfileArgs } from "../args/user.args";
import { UserService } from "../services/user.service";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { loginSchema, z } from "@nextier/dto";

@Resolver(() => User)
export class UserResolver extends BaseResolver(User) {
  constructor(private userService: UserService) {
    super();
  }

  @Query(() => User)
  @UseAuthGuard()
  async me(@Auth() user: User) {
    return user;
  }

  @Mutation(() => LoginPayload)
  async login(@Args() args: LoginArgs) {
    const input = this.validate(loginSchema, args.input);
    return this.userService.login(input);
  }

  @UseAuthGuard()
  @Mutation(() => UpdateProfilePayload)
  async updateProfile(@Auth() user: User, @Args() args: UpdateProfileArgs) {
    const input = this.validate(
      z.object({ name: z.string().min(3).max(100) }),
      args.input,
    );
    return this.userService.updateProfile(user.id, input);
  }
}
