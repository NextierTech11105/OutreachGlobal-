import { Controller, Get, Query, Res } from "@nestjs/common";
import { AnyObject } from "@nextier/common";
import { IntegrationService } from "../services/integration.service";
import { FastifyReply } from "fastify";

@Controller("oauth")
export class IntegrationOauthController {
  constructor(private service: IntegrationService) {}

  @Get("zoho/callback")
  async zohoCallback(@Query() query: AnyObject, @Res() res: FastifyReply) {
    const { uri } = await this.service.authorize(query.state, query);
    res.redirect(uri, 302);
  }
}
