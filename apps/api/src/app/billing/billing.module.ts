import { Global, Module } from "@nestjs/common";
import { SubscriptionService } from "./services/subscription.service";
import { TrialGuard } from "./guards/trial.guard";

/**
 * BILLING MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * Handles subscriptions, trials, payments, and usage tracking.
 * @Global() so services are available throughout the app.
 * ═══════════════════════════════════════════════════════════════════════════
 */

@Global()
@Module({
  providers: [SubscriptionService, TrialGuard],
  exports: [SubscriptionService, TrialGuard],
})
export class BillingModule {}
