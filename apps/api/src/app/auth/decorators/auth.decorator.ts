import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";

export const Auth = createParamDecorator((_, context: ExecutionContext) => {
  const type = context.getType<GqlContextType>();
  if (type === "graphql") {
    const ctx = GqlExecutionContext.create(context);

    return ctx.getContext().req.user || null;
  }

  if (type === "http") {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();

    return req.user || null;
  }

  return null;
});
