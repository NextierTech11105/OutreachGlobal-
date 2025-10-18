import { ModelNotFoundError } from "@/database/exceptions";
import {
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { GraphQLError } from "graphql";

@Catch(BadRequestException, UnprocessableEntityException, ModelNotFoundError)
export class GraphqlExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException | ModelNotFoundError) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      throw new GraphQLError(response.message, {
        extensions: {
          ...response,
        },
      });
    } else {
      throw new GraphQLError(exception.message || "not found", {
        extensions: {
          message: exception.message,
        },
      });
    }
  }
}
