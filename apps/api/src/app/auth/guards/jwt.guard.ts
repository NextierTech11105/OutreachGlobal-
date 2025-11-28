import { ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { FastifyRequest } from "fastify";

export class JwtGuard {
  getRequest(context: ExecutionContext): FastifyRequest {
    const type = context.getType<GqlContextType>();
    if (type === "graphql") {
      const gqlContext = GqlExecutionContext.create(context).getContext();
      return gqlContext.req;
    }

    return context.switchToHttp().getRequest();
  }

  protected extractTokenFromHeader(
    request: FastifyRequest,
  ): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
