import { REQUEST } from "@nestjs/core";
import { FastifyRequest } from "fastify";
import { Throttle } from "@nestjs/throttler";
import { ThrottlerGuard } from "./auth/guards";
import { Inject, UseGuards } from "@nestjs/common";
import { z } from "@nextier/dto";
import { parseSchema } from "@/lib/zod/validate-input";

@UseGuards(ThrottlerGuard)
@Throttle({
  default: {
    ttl: 60000,
    limit: 60,
  },
})
export class BaseController {
  @Inject(REQUEST) private req: FastifyRequest;

  validate<T extends z.ZodObject, O extends Record<string, any>>(
    schema: T,
    data?: O,
  ) {
    return parseSchema(
      schema,
      data === undefined ? (this.req.body as any) : data,
    );
  }
}
