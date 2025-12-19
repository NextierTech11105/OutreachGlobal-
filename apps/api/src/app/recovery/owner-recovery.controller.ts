import { OwnerRecoveryService } from "./owner-recovery.service";
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest } from "fastify";
import { Logger } from "@nestjs/common";

@Controller("/__emergency")
export class OwnerRecoveryController {
  private readonly logger = new Logger(OwnerRecoveryController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ownerRecoveryService: OwnerRecoveryService,
  ) {}

  @Get("restore-owner")
  async restoreOwner(@Req() req: FastifyRequest) {
    const enabled = this.configService.get<string>("ENABLE_EMERGENCY_ADMIN") === "true";
    if (!enabled) {
      throw new NotFoundException();
    }

    const expected = this.configService.get<string>("OWNER_RECOVERY_TOKEN");
    const provided = (req.headers["x-owner-recovery-token"] as string | undefined)?.trim();
    if (!expected || !provided || !this.ownerRecoveryService.constantTimeEquals(provided, expected)) {
      throw new BadRequestException("Invalid recovery token");
    }

    const allowlist = (this.configService.get<string>("OWNER_RECOVERY_IP_ALLOWLIST") || "127.0.0.1,::1").split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    const reqIp = (req.ip || "").trim();
    if (!allowlist.includes(reqIp)) {
      throw new BadRequestException("IP not allowed");
    }

    const context = await this.ownerRecoveryService.ensureOwnerAnchor("emergency-route");
    this.logger.log(`Emergency restore invoked at ${new Date().toISOString()} from ${reqIp}`);

    return {
      ok: true,
      userId: context?.user.id,
      teamId: context?.team?.id,
      message: "Owner restored",
    };
  }
}
