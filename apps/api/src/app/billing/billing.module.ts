/**
 * Billing Module
 * Handles subscriptions, credits, Stripe integration, and usage tracking
 */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

// Services
import { CreditService } from "./services/credit.service";
import { StripeService } from "./services/stripe.service";

// Controllers
import { StripeWebhookController } from "./controllers/stripe-webhook.controller";
import { BillingController } from "./controllers/billing.controller";

// Guards
import { CreditGuard } from "./guards/credit.guard";

// Resolvers
import { BillingResolver } from "./resolvers/billing.resolver";

@Module({
  imports: [ConfigModule],
  providers: [
    // Services
    CreditService,
    StripeService,
    // Guards
    CreditGuard,
    // Resolvers
    BillingResolver,
  ],
  controllers: [StripeWebhookController, BillingController],
  exports: [CreditService, StripeService, CreditGuard],
})
export class BillingModule {}
