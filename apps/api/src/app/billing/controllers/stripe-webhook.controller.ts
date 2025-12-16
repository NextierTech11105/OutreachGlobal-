/**
 * Stripe Webhook Controller
 * Handles incoming webhooks from Stripe for subscription and payment events
 */
import {
  Controller,
  Post,
  Headers,
  Req,
  RawBodyRequest,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { StripeService } from "../services/stripe.service";

@Controller("webhooks/stripe")
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private stripeService: StripeService) {}

  /**
   * Handle Stripe webhook events
   * Stripe authenticates via webhook signature
   */
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      this.logger.warn("Webhook received without signature");
      return { received: false };
    }

    const payload = req.rawBody;
    if (!payload) {
      this.logger.warn("Webhook received without body");
      return { received: false };
    }

    try {
      await this.stripeService.handleWebhook(payload, signature);
      return { received: true };
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Return 200 to acknowledge receipt even if processing fails
      // This prevents Stripe from retrying
      return { received: true };
    }
  }
}
