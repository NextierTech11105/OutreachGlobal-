import { Global, Module } from "@nestjs/common";
import { SubscriptionService } from "./services/subscription.service";
import { TrialGuard } from "./guards/trial.guard";
import { BillingSeeder } from "./seeders/billing.seeder";

/**
 * BILLING MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * Handles subscriptions, trials, payments, and usage tracking.
 * @Global() so services are available throughout the app.
 * ═══════════════════════════════════════════════════════════════════════════
 */

@Global()
@Module({
  providers: [SubscriptionService, TrialGuard, BillingSeeder],
  exports: [SubscriptionService, TrialGuard, BillingSeeder],
})
export class BillingModule {}
