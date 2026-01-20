import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { User } from "../models/user.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import {
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  OAuthLoginPayload,
} from "../objects/user.object";
import {
  LoginArgs,
  RegisterArgs,
  UpdateProfileArgs,
  OAuthLoginArgs,
} from "../args/user.args";
import { UserService } from "../services/user.service";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { loginSchema, z } from "@nextier/dto";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  companyName: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
});

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

  @Mutation(() => RegisterPayload)
  async register(@Args() args: RegisterArgs) {
    const input = this.validate(registerSchema, args.input);
    return this.userService.register(input);
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

  @Mutation(() => OAuthLoginPayload)
  async oauthLogin(@Args() args: OAuthLoginArgs) {
    const input = this.validate(
      z.object({
        email: z.string().email(),
        provider: z.enum(["google"]),
        name: z.string().min(1).max(100).optional(),
        googleId: z.string().optional(),
      }),
      args.input,
    );
    return this.userService.oauthLogin(input);
  }
}
