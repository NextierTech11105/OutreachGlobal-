import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { subscriptions, plans, usage, invoices } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAuthenticatedSubscription } from "@/lib/billing-auth";

/**
 * MY SUBSCRIPTION API
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/billing/my-subscription - Get current user's subscription details
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Returns: subscription details, plan info, usage, invoices, payment method
 * Used by: Customer-facing billing dashboard
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface SubscriptionResponse {
  subscription: {
    id: string;
    status: string;
    planName: string;
    planSlug: string;
    priceMonthly: number;
    priceYearly: number;
    billingCycle: string;
    currentPeriodEnd: string;
    currentPeriodStart: string;
    trialEndsAt: string | null;
    cancelledAt: string | null;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    leads: { used: number; limit: number };
    sms: { used: number; limit: number };
    skipTraces: { used: number; limit: number };
    users: { used: number; limit: number };
  };
  invoices: Array<{
    id: string;
    date: string;
    amount: string;
    status: string;
    downloadUrl?: string;
  }>;
  paymentMethod: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
  } | null;
}

// Default plan limits by plan slug
const PLAN_LIMITS: Record<
  string,
  { leads: number; sms: number; skipTraces: number; users: number }
> = {
  starter: { leads: 1000, sms: 500, skipTraces: 50, users: 1 },
  pro: { leads: 5000, sms: 2500, skipTraces: 250, users: 3 },
  agency: { leads: 25000, sms: 10000, skipTraces: 1000, users: 10 },
  "white-label": { leads: 100000, sms: 50000, skipTraces: 5000, users: 50 },
};

const PLAN_PRICES: Record<
  string,
  { monthly: number; yearly: number; name: string }
> = {
  starter: { monthly: 297, yearly: 2970, name: "Starter" },
  pro: { monthly: 597, yearly: 5970, name: "Pro" },
  agency: { monthly: 1497, yearly: 14970, name: "Agency" },
  "white-label": { monthly: 2997, yearly: 29970, name: "White Label" },
};

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user's subscription
    const authResult = await getAuthenticatedSubscription();

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status },
      );
    }

    const { subscription, userId, teamId } = authResult;

    // Get plan details
    let planInfo = PLAN_PRICES["starter"]; // Default
    let planLimits = PLAN_LIMITS["starter"];
    let planSlug = "starter";

    if (subscription.planId && db) {
      try {
        const planResult = await db
          .select()
          .from(plans)
          .where(eq(plans.id, subscription.planId))
          .limit(1);

        if (planResult.length > 0) {
          const plan = planResult[0];
          planSlug = plan.slug || "starter";
          planInfo = PLAN_PRICES[planSlug] || planInfo;
          planLimits = PLAN_LIMITS[planSlug] || planLimits;
        }
      } catch (e) {
        Logger.warn("Billing", "Could not fetch plan details", {
          planId: subscription.planId,
        });
      }
    }

    // Get usage for current period
    let currentUsage = {
      leads: { used: 0, limit: planLimits.leads },
      sms: { used: 0, limit: planLimits.sms },
      skipTraces: { used: 0, limit: planLimits.skipTraces },
      users: { used: 1, limit: planLimits.users },
    };

    if (db) {
      try {
        const usageResult = await db
          .select()
          .from(usage)
          .where(eq(usage.subscriptionId, subscription.id))
          .orderBy(desc(usage.periodStart))
          .limit(1);

        if (usageResult.length > 0) {
          const u = usageResult[0];
          currentUsage = {
            leads: { used: u.leadsCreated || 0, limit: planLimits.leads },
            sms: { used: u.smsSent || 0, limit: planLimits.sms },
            skipTraces: {
              used: u.skipTraces || 0,
              limit: planLimits.skipTraces,
            },
            users: { used: 1, limit: planLimits.users }, // Would need to count team members
          };
        }
      } catch (e) {
        Logger.warn("Billing", "Could not fetch usage", {
          subscriptionId: subscription.id,
        });
      }
    }

    // Get recent invoices
    let recentInvoices: SubscriptionResponse["invoices"] = [];

    if (db) {
      try {
        const invoiceResult = await db
          .select()
          .from(invoices)
          .where(eq(invoices.subscriptionId, subscription.id))
          .orderBy(desc(invoices.dueDate))
          .limit(10);

        recentInvoices = invoiceResult.map((inv) => ({
          id: inv.stripeInvoiceId || inv.id,
          date: inv.dueDate?.toISOString() || new Date().toISOString(),
          amount: `$${((inv.amountDue || 0) / 100).toFixed(2)}`,
          status: inv.status || "pending",
          downloadUrl: inv.invoicePdf || undefined,
        }));
      } catch (e) {
        Logger.warn("Billing", "Could not fetch invoices", {
          subscriptionId: subscription.id,
        });
      }
    }

    // Get payment method from Stripe (if configured)
    let paymentMethod: SubscriptionResponse["paymentMethod"] = null;

    if (STRIPE_SECRET_KEY && subscription.stripeCustomerId) {
      try {
        const stripe = new Stripe(STRIPE_SECRET_KEY);
        const customer = await stripe.customers.retrieve(
          subscription.stripeCustomerId,
          {
            expand: ["invoice_settings.default_payment_method"],
          },
        );

        if (
          !customer.deleted &&
          customer.invoice_settings?.default_payment_method
        ) {
          const pm = customer.invoice_settings.default_payment_method;
          if (typeof pm !== "string" && pm.card) {
            paymentMethod = {
              id: pm.id,
              brand: pm.card.brand || "card",
              last4: pm.card.last4 || "****",
              expMonth: pm.card.exp_month || 1,
              expYear: pm.card.exp_year || 2030,
              isDefault: true,
            };
          }
        }
      } catch (e) {
        Logger.warn("Billing", "Could not fetch payment method from Stripe");
      }
    }

    // Build response
    const response: SubscriptionResponse = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName: planInfo.name,
        planSlug,
        priceMonthly: planInfo.monthly,
        priceYearly: planInfo.yearly,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        trialEndsAt: subscription.trialEndsAt?.toISOString() || null,
        cancelledAt: subscription.canceledAt?.toISOString() || null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      },
      usage: currentUsage,
      invoices: recentInvoices,
      paymentMethod,
    };

    Logger.info("Billing", "Fetched subscription for user", { userId, teamId });

    return NextResponse.json(response);
  } catch (error: any) {
    Logger.error("Billing", "Failed to fetch subscription", {
      error: error.message,
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}
