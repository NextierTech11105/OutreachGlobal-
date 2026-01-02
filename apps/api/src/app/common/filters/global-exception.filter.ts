import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { GqlContextType, GqlArgumentsHost } from "@nestjs/graphql";
import { FastifyReply, FastifyRequest } from "fastify";

interface ErrorResponse {
  error: string;
  code: string;
  correlationId: string;
  timestamp: string;
  path?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const type = host.getType<GqlContextType>();
    const correlationId = this.getCorrelationId(host, type);
    const timestamp = new Date().toISOString();

    if (type === "graphql") {
      this.handleGraphQLException(exception, host, correlationId, timestamp);
    } else {
      this.handleHttpException(exception, host, correlationId, timestamp);
    }
  }

  private getCorrelationId(host: ArgumentsHost, type: GqlContextType): string {
    if (type === "graphql") {
      const gqlHost = GqlArgumentsHost.create(host);
      const ctx = gqlHost.getContext();
      return ctx?.req?.correlationId || "unknown";
    }
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    return (request as any).correlationId || "unknown";
  }

  private handleGraphQLException(
    exception: unknown,
    host: ArgumentsHost,
    correlationId: string,
    timestamp: string,
  ): void {
    const status = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);

    this.logger.error({
      message: `GraphQL Exception: ${message}`,
      correlationId,
      timestamp,
      status,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    throw exception;
  }

  private handleHttpException(
    exception: unknown,
    host: ArgumentsHost,
    correlationId: string,
    timestamp: string,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);

    const errorResponse: ErrorResponse = {
      error: message,
      code: this.getErrorCode(exception, status),
      correlationId,
      timestamp,
      path: request.url,
    };

    this.logger.error({
      message: `HTTP Exception: ${message}`,
      correlationId,
      timestamp,
      status,
      method: request.method,
      url: request.url,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).send(errorResponse);
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") {
        return response;
      }
      if (typeof response === "object" && response !== null) {
        return (response as any).message || exception.message;
      }
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return "Internal server error";
  }

  private getErrorCode(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (
        typeof response === "object" &&
        response !== null &&
        (response as any).error
      ) {
        return (response as any).error.toUpperCase().replace(/\s+/g, "_");
      }
    }
    switch (status) {
      case 400:
        return "BAD_REQUEST";
      case 401:
        return "UNAUTHORIZED";
      case 403:
        return "FORBIDDEN";
      case 404:
        return "NOT_FOUND";
      case 409:
        return "CONFLICT";
      case 422:
        return "VALIDATION_ERROR";
      case 429:
        return "TOO_MANY_REQUESTS";
      default:
        return "INTERNAL_ERROR";
    }
  }
}
