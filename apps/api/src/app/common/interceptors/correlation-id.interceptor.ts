import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { FastifyRequest, FastifyReply } from "fastify";

const CORRELATION_ID_HEADER = "x-correlation-id";

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType<GqlContextType>();
    let request: FastifyRequest;
    let response: FastifyReply;

    if (type === "graphql") {
      const gqlContext = GqlExecutionContext.create(context);
      request = gqlContext.getContext().req;
      response = gqlContext.getContext().res;
    } else {
      request = context.switchToHttp().getRequest();
      response = context.switchToHttp().getResponse();
    }

    const existingId = request.headers[CORRELATION_ID_HEADER] as string;
    const correlationId =
      existingId ||
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    (request as any).correlationId = correlationId;

    return next.handle().pipe(
      tap(() => {
        if (response && typeof response.header === "function") {
          response.header(CORRELATION_ID_HEADER, correlationId);
        }
      }),
    );
  }
}
