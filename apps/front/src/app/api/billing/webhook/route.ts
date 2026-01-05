import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, invoices, payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// SECURITY: Warn at startup if webhook is not properly configured
if (!STRIPE_WEBHOOK_SECRET) {
  console.warn(
    "[Billing Webhook] STRIPE_WEBHOOK_SECRET not configured - webhook verification disabled",
  );
}

// POST /api/billing/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    console.log("[Billing Webhook] Stripe not configured - skipping");
    return NextResponse.json({ received: true, skipped: true });
  }

  // SECURITY: Require webhook secret in production
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("[Billing Webhook] CRITICAL: Webhook secret not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 },
      );
    }

    let event: any;

    // Verify webhook signature (REQUIRED)
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      console.error(
        "[Billing Webhook] Signature verification failed:",
        err.message,
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`[Billing Webhook] Received event: ${event.type}`);

    // Get Stripe instance for customer lookup
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    switch (event.type) {
      case "customer.subscription.created": {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        // Provision tenant in backend (sends onboarding email)
        await provisionTenantForNewSubscription(stripe, subscription);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      default:
        console.log(`[Billing Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Billing Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// Handle subscription creation or update
async function handleSubscriptionUpdate(stripeSubscription: any) {
  const subscriptionId = stripeSubscription.id;
  const customerId = stripeSubscription.customer;
  const status = mapStripeStatus(stripeSubscription.status);

  // Find subscription by Stripe ID
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (existingSubscription) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        status,
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000,
        ),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    console.log(
      `[Billing Webhook] Updated subscription ${existingSubscription.id} to status: ${status}`,
    );
  } else {
    console.log(
      `[Billing Webhook] Subscription not found for Stripe ID: ${subscriptionId}`,
    );
  }
}

// Handle subscription cancellation
async function handleSubscriptionCanceled(stripeSubscription: any) {
  const subscriptionId = stripeSubscription.id;

  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (existingSubscription) {
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    console.log(
      `[Billing Webhook] Canceled subscription ${existingSubscription.id}`,
    );
  }
}

// Handle successful invoice payment
async function handleInvoicePaid(stripeInvoice: any) {
  const subscriptionId = stripeInvoice.subscription;

  // Find our subscription
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (!subscription) {
    console.log(
      `[Billing Webhook] Subscription not found for invoice: ${stripeInvoice.id}`,
    );
    return;
  }

  // Create invoice record
  await db.insert(invoices).values({
    subscriptionId: subscription.id,
    stripeInvoiceId: stripeInvoice.id,
    amount: stripeInvoice.amount_paid,
    status: "paid",
    periodStart: new Date(stripeInvoice.period_start * 1000),
    periodEnd: new Date(stripeInvoice.period_end * 1000),
    paidAt: new Date(),
    invoiceUrl: stripeInvoice.hosted_invoice_url,
    invoicePdf: stripeInvoice.invoice_pdf,
  });

  // Ensure subscription is active
  await db
    .update(subscriptions)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  console.log(
    `[Billing Webhook] Invoice paid for subscription ${subscription.id}`,
  );
}

// Handle failed payment
async function handlePaymentFailed(stripeInvoice: any) {
  const subscriptionId = stripeInvoice.subscription;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
  });

  if (!subscription) {
    return;
  }

  // Create failed invoice record
  await db.insert(invoices).values({
    subscriptionId: subscription.id,
    stripeInvoiceId: stripeInvoice.id,
    amount: stripeInvoice.amount_due,
    status: "failed",
    periodStart: new Date(stripeInvoice.period_start * 1000),
    periodEnd: new Date(stripeInvoice.period_end * 1000),
    invoiceUrl: stripeInvoice.hosted_invoice_url,
  });

  // Update subscription status
  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  console.log(
    `[Billing Webhook] Payment failed for subscription ${subscription.id}`,
  );

  // TODO: Send payment failed notification email
}

// Handle successful payment intent
async function handlePaymentSucceeded(paymentIntent: any) {
  const subscriptionId = paymentIntent.metadata?.subscriptionId;

  if (!subscriptionId) {
    return;
  }

  // Record payment
  await db.insert(payments).values({
    subscriptionId,
    stripePaymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    status: "succeeded",
    paymentMethod: paymentIntent.payment_method_types?.[0] || "card",
  });

  console.log(`[Billing Webhook] Payment succeeded: ${paymentIntent.id}`);
}

// Map Stripe subscription status to our status
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "past_due";
    case "trialing":
      return "trialing";
    case "incomplete":
    case "incomplete_expired":
      return "pending";
    default:
      return "active";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TENANT PROVISIONING (API-KEY GOVERNANCE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Provision a tenant in the backend when a new subscription is created.
 *
 * This triggers:
 * 1. Tenant upgrade: DEMO → PENDING_ONBOARDING
 * 2. API key creation (ADMIN_KEY + DEV_KEY)
 * 3. Onboarding email with strategy session invite
 */
async function provisionTenantForNewSubscription(
  stripe: any,
  stripeSubscription: any,
): Promise<void> {
  try {
    const customerId = stripeSubscription.customer;
    const subscriptionId = stripeSubscription.id;

    // Get customer details from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = customer.email;
    const customerName = customer.name || customer.metadata?.name;

    if (!customerEmail) {
      console.error(
        `[Billing Webhook] No email found for customer ${customerId}`,
      );
      return;
    }

    // Determine product pack from subscription items
    const productPack = getProductPackFromSubscription(stripeSubscription);

    // Get tenant ID from customer metadata (if demo user upgraded)
    const tenantId = customer.metadata?.tenantId;
    const tenantSlug = customer.metadata?.tenantSlug;

    console.log(
      `[Billing Webhook] Provisioning tenant for ${customerEmail} (pack: ${productPack})`,
    );

    // Call backend to provision the tenant
    // This creates API keys and sends the onboarding email
    const response = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation ProvisionPaidTenant($input: ProvisionPaidTenantInput!, $webhookSecret: String!) {
            provisionPaidTenant(input: $input, webhookSecret: $webhookSecret) {
              success
              tenantId
              adminKeyPrefix
              devKeyPrefix
              error
            }
          }
        `,
        variables: {
          input: {
            tenantId,
            tenantSlug,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            productPack,
            customerEmail,
            customerName,
          },
          webhookSecret: STRIPE_WEBHOOK_SECRET,
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error(
        `[Billing Webhook] GraphQL errors:`,
        JSON.stringify(result.errors),
      );
      return;
    }

    const provision = result.data?.provisionPaidTenant;

    if (provision?.success) {
      console.log(
        `[Billing Webhook] Tenant provisioned successfully: ${provision.tenantId}`,
      );
      console.log(
        `[Billing Webhook] API keys created: ${provision.adminKeyPrefix}, ${provision.devKeyPrefix}`,
      );
    } else {
      console.error(
        `[Billing Webhook] Tenant provisioning failed: ${provision?.error}`,
      );
    }
  } catch (error: any) {
    console.error(
      `[Billing Webhook] Error provisioning tenant:`,
      error.message,
    );
  }
}

/**
 * Determine product pack from Stripe subscription
 */
function getProductPackFromSubscription(stripeSubscription: any): string {
  // Check subscription metadata first
  if (stripeSubscription.metadata?.productPack) {
    return stripeSubscription.metadata.productPack;
  }

  // Check price/product metadata
  const items = stripeSubscription.items?.data || [];
  for (const item of items) {
    const priceMetadata = item.price?.metadata;
    if (priceMetadata?.productPack) {
      return priceMetadata.productPack;
    }

    const productMetadata = item.price?.product?.metadata;
    if (productMetadata?.productPack) {
      return productMetadata.productPack;
    }

    // Try to infer from product name
    const productName = item.price?.product?.name?.toLowerCase() || "";
    if (productName.includes("full") || productName.includes("enterprise")) {
      return "FULL_PLATFORM";
    }
    if (productName.includes("campaign")) {
      return "CAMPAIGN_ENGINE";
    }
    if (productName.includes("data")) {
      return "DATA_ENGINE";
    }
  }

  // Default to full platform
  return "FULL_PLATFORM";
}
