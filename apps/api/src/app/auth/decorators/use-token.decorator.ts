import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";

/** Get Current authentiacated token */
export const UseToken = createParamDecorator((_, context: ExecutionContext) => {
  const type = context.getType<GqlContextType>();
  if (type === "graphql") {
    const ctx = GqlExecutionContext.create(context);
    const authorization = ctx.getContext().req?.headers["authorization"];
    if (!authorization) {
      return null;
    }

    return authorization.split(" ")[1];
  }

  if (type === "http") {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();

    if (!req.headers.authorization) {
      return null;
    }

    return req.headers.authorization.split(" ")[1];
  }

  return null;
});
