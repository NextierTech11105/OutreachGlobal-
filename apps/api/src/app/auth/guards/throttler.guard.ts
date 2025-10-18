import { ExecutionContext, Injectable } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { ThrottlerGuard as NestThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const type = context.getType<GqlContextType>();

    if (type === "graphql") {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext();
      return { req: ctx.req, res: ctx.res };
    }

    return super.getRequestResponse(context);
  }
}
