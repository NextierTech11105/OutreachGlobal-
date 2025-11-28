import { JwtService } from "@/lib/jwt/jwt.service";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { JwtGuard } from "./jwt.guard";
import { GqlContextType } from "@nestjs/graphql";

@Injectable()
export class AuthGuard extends JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const type = context.getType<GqlContextType>();
    const request = this.getRequest(context);

    if (type === "graphql") {
      // used from context
      if (!request["user"] || !request["tokenPayload"]) {
        throw new UnauthorizedException();
      }

      return true;
    }

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const { payload } = await this.jwtService.verify(token);
      const user = await this.authService.getUser(payload);
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request["user"] = user;
      request["tokenPayload"] = payload;
    } catch (error) {
      throw new UnauthorizedException(error);
    }
    return true;
  }
}
