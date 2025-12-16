import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  subscriptionsTable,
  plansTable,
  creditPacksTable,
} from "@/database/schema-alias";
import { eq } from "drizzle-orm";
import { CreditService, CreditType } from "./credit.service";
import Stripe from "stripe";

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    @InjectDB() private db: DrizzleClient,
    private configService: ConfigService,
    private creditService: CreditService,
  ) {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: "2025-02-24.acacia",
      });
    }
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(options: {
    teamId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<{ sessionId: string; url: string }> {
    const plan = await this.db.query.plans.findFirst({
      where: eq(plansTable.id, options.planId),
    });

    if (!plan || !plan.stripePriceIdMonthly) {
      throw new Error("Invalid plan or plan not configured for Stripe");
    }

    // Get or create Stripe customer
    let customerId = await this.getStripeCustomerId(options.teamId);
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: options.customerEmail,
        metadata: { teamId: options.teamId },
      });
      customerId = customer.id;

      // Save customer ID
      await this.db
        .update(subscriptionsTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(subscriptionsTable.teamId, options.teamId));
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: plan.stripePriceIdMonthly,
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: {
        teamId: options.teamId,
        planId: options.planId,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Create checkout session for credit pack purchase
   */
  async createCreditPackCheckout(options: {
    teamId: string;
    packId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }> {
    const pack = await this.db.query.creditPacks.findFirst({
      where: eq(creditPacksTable.id, options.packId),
    });

    if (!pack || !pack.stripePriceId) {
      throw new Error("Invalid credit pack or pack not configured for Stripe");
    }

    let customerId = await this.getStripeCustomerId(options.teamId);
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        metadata: { teamId: options.teamId },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price: pack.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: {
        teamId: options.teamId,
        packId: options.packId,
        creditType: pack.creditType,
        creditAmount: pack.creditAmount.toString(),
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Get billing portal URL for customer to manage subscription
   */
  async createBillingPortalSession(
    teamId: string,
    returnUrl: string,
  ): Promise<string> {
    const customerId = await this.getStripeCustomerId(teamId);
    if (!customerId) {
      throw new Error("No Stripe customer found for this team");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const teamId = session.metadata?.teamId;
    if (!teamId) return;

    // Credit pack purchase
    if (session.mode === "payment" && session.metadata?.packId) {
      const creditType = session.metadata.creditType as CreditType;
      const creditAmount = parseInt(session.metadata.creditAmount || "0", 10);

      if (creditAmount > 0) {
        await this.creditService.addCredits({
          teamId,
          creditType,
          amount: creditAmount,
          transactionType: "purchase",
          stripePaymentIntentId: session.payment_intent as string,
          description: `Purchased ${creditAmount} ${creditType} credits`,
        });

        this.logger.log(
          `Added ${creditAmount} ${creditType} credits to team ${teamId} from credit pack purchase`,
        );
      }
    }

    // Subscription checkout is handled by subscription.created webhook
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const teamId = subscription.metadata?.teamId;
    if (!teamId) return;

    await this.db
      .update(subscriptionsTable)
      .set({
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.teamId, teamId));

    this.logger.log(`Updated subscription for team ${teamId}: ${subscription.status}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const teamId = subscription.metadata?.teamId;
    if (!teamId) return;

    await this.db
      .update(subscriptionsTable)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.teamId, teamId));

    this.logger.log(`Subscription canceled for team ${teamId}`);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // When subscription renews, add monthly credits
    if (invoice.subscription) {
      const subscription = await this.stripe.subscriptions.retrieve(
        invoice.subscription as string,
      );
      const teamId = subscription.metadata?.teamId;
      const planId = subscription.metadata?.planId;

      if (teamId && planId) {
        const plan = await this.db.query.plans.findFirst({
          where: eq(plansTable.id, planId),
        });

        if (plan) {
          // Add monthly AI credits
          if (plan.aiCreditsMonthly > 0) {
            await this.creditService.addCredits({
              teamId,
              creditType: "ai",
              amount: plan.aiCreditsMonthly,
              transactionType: "subscription",
              description: `Monthly ${plan.name} plan AI credits`,
            });
          }

          // Add monthly enrichment credits
          if (plan.enrichmentCreditsMonthly > 0) {
            await this.creditService.addCredits({
              teamId,
              creditType: "enrichment",
              amount: plan.enrichmentCreditsMonthly,
              transactionType: "subscription",
              description: `Monthly ${plan.name} plan enrichment credits`,
            });
          }

          this.logger.log(
            `Added monthly credits for team ${teamId}: ${plan.aiCreditsMonthly} AI, ${plan.enrichmentCreditsMonthly} enrichment`,
          );
        }
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = invoice.subscription
      ? await this.stripe.subscriptions.retrieve(invoice.subscription as string)
      : null;

    if (subscription) {
      const teamId = subscription.metadata?.teamId;
      if (teamId) {
        await this.db
          .update(subscriptionsTable)
          .set({
            status: "past_due",
            updatedAt: new Date(),
          })
          .where(eq(subscriptionsTable.teamId, teamId));

        this.logger.warn(`Payment failed for team ${teamId}`);
      }
    }
  }

  private async getStripeCustomerId(teamId: string): Promise<string | null> {
    const subscription = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptionsTable.teamId, teamId),
    });

    return subscription?.stripeCustomerId || null;
  }
}
