import { Controller, Get, Query, Res, Logger } from "@nestjs/common";
import { AnyObject } from "@nextier/common";
import { IntegrationService } from "../services/integration.service";
import { FastifyReply } from "fastify";

@Controller("oauth")
export class IntegrationOauthController {
  private readonly logger = new Logger(IntegrationOauthController.name);

  constructor(private service: IntegrationService) {}

  @Get("callback")
  async oauthCallback(@Query() query: AnyObject, @Res() res: FastifyReply) {
    // Validate environment variable
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      this.logger.error("FRONTEND_URL environment variable is not set");
      return res.status(500).send("Server configuration error");
    }

    // Generic OAuth callback - provider is determined from state parameter
    const provider = query.provider || "unknown";
    try {
      await this.service.authorize(query.state, provider, query);
      // Redirect to success page
      return res.redirect(
        `${frontendUrl}/settings/integrations?success=true`,
        302,
      );
    } catch (error) {
      // Log the error for debugging
      this.logger.error(
        `OAuth callback failed for provider ${provider}:`,
        error instanceof Error ? error.message : error,
      );
      // Redirect to error page
      return res.redirect(
        `${frontendUrl}/settings/integrations?error=true`,
        302,
      );
    }
  }
}
