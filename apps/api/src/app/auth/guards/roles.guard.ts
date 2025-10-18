import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { ROLES_KEY } from "../auth.constants";
import type { User } from "@/app/user/models/user.model";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  validateRoles(user: User, roles: string[]) {
    return roles.includes(user.role);
  }

  getUser(context: ExecutionContext) {
    const type = context.getType<GqlContextType>();

    if (type === "graphql") {
      const ctx = GqlExecutionContext.create(context);
      const req = ctx.getContext().req;
      return req.user as User;
    }

    const req = context.switchToHttp().getRequest();

    return req.user as User;
  }

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const user = this.getUser(context);
    if (!user) {
      throw new UnauthorizedException();
    }

    if (!this.validateRoles(user, roles)) {
      throw new UnauthorizedException("Unauthorized");
    }

    return true;
  }
}
