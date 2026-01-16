import { Controller, Get, Query, Res } from "@nestjs/common";
import { AnyObject } from "@nextier/common";
import { IntegrationService } from "../services/integration.service";
import { FastifyReply } from "fastify";

@Controller("oauth")
export class IntegrationOauthController {
  constructor(private service: IntegrationService) {}

  @Get("callback")
  async oauthCallback(@Query() query: AnyObject, @Res() res: FastifyReply) {
    // Generic OAuth callback - provider is determined from state parameter
    const provider = query.provider || "unknown";
    try {
      await this.service.authorize(query.state, provider, query);
      // Redirect to success page
      res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=true`, 302);
    } catch (error) {
      // Redirect to error page
      res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=true`, 302);
    }
  }
}
