import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";

/**
 * TenantContext parameter decorator
 * Extracts team and user context from the request
 *
 * Usage:
 *   @TenantContext("teamId") teamId: string
 *   @TenantContext("userId") userId: string
 *   @TenantContext() ctx: { teamId: string; userId: string }
 */
export const TenantContext = createParamDecorator(
  (key: "teamId" | "userId" | undefined, context: ExecutionContext) => {
    const type = context.getType<GqlContextType>();
    let request: any;

    if (type === "graphql") {
      const ctx = GqlExecutionContext.create(context);
      request = ctx.getContext().req;
    } else {
      request = context.switchToHttp().getRequest();
    }

    // Extract from various sources (auth guard sets these)
    const teamId =
      request?.team?.id ||
      request?.tokenPayload?.teamId ||
      request?.user?.teamId;
    const userId =
      request?.user?.id || request?.tokenPayload?.userId || request?.userId;

    const tenantContext = { teamId, userId };

    if (key) {
      return tenantContext[key];
    }

    return tenantContext;
  },
);
