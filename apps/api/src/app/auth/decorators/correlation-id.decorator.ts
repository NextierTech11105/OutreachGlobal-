import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";

/**
 * CorrelationId parameter decorator
 * Extracts the correlation ID from the request (set by CorrelationIdInterceptor)
 *
 * Usage:
 *   @CorrelationId() traceId: string
 */
export const CorrelationId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string => {
    const type = context.getType<GqlContextType>();
    let request: any;

    if (type === "graphql") {
      const ctx = GqlExecutionContext.create(context);
      request = ctx.getContext().req;
    } else {
      request = context.switchToHttp().getRequest();
    }

    // Get correlation ID set by interceptor, or generate one
    return (
      request?.correlationId ||
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    );
  },
);
