import { OwnerRecoveryService } from "./owner-recovery.service";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest, FastifyReply } from "fastify";

function normalizeHeader(header?: string | string[]): string | undefined {
  if (!header) return undefined;
  return Array.isArray(header) ? header[0] : header;
}

@Injectable()
export class OwnerRecoveryMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly ownerRecoveryService: OwnerRecoveryService,
  ) {}

  async use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const expected = this.configService.get<string>("OWNER_RECOVERY_TOKEN");
    const provided = normalizeHeader(
      req.headers["x-owner-recovery-token"] as any,
    )?.trim();

    if (
      expected &&
      provided &&
      this.ownerRecoveryService.constantTimeEquals(provided, expected)
    ) {
      const context =
        await this.ownerRecoveryService.ensureOwnerAnchor("recovery-header");
      if (context?.user) {
        req["user"] = context.user;
        req["tokenPayload"] = {
          sub: context.user.id,
          jti: `recovery:${context.user.id}`,
          username: context.user.email,
        };
        req["recoveryMode"] = true;
      }
    }

    next();
  }
}
