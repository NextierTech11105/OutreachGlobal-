import { ThrottlerGuard } from "@/app/auth/guards";
import { Type, UseFilters, UseGuards } from "@nestjs/common";
import { Resolver } from "@nestjs/graphql";
import { Throttle } from "@nestjs/throttler";
import { GraphqlExceptionFilter } from "./filters/graphql-exception.filter";
import { z } from "@nextier/dto";
import { parseSchema } from "@/lib/zod/validate-input";

export function BaseResolver<T extends Type<unknown>>(classRef: T) {
  @UseFilters(GraphqlExceptionFilter)
  @Resolver({ isAbstract: true })
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      ttl: 60000,
      limit: 2000,
    },
  })
  abstract class BaseResolverHost {
    validate<T extends z.ZodObject, O extends Record<string, any>>(
      schema: T,
      data: O,
    ) {
      return parseSchema(schema, data);
    }
  }
  return BaseResolverHost;
}
