import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, invoices, payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// POST /api/billing/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    console.log("[Billing Webhook] Stripe not configured - skipping");
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    let event: any;

    // Verify webhook signature if secret is configured
    if (STRIPE_WEBHOOK_SECRET && signature) {
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
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 },
        );
      }
    } else {
      // Parse without verification (development only)
      event = JSON.parse(body);
      console.warn("[Billing Webhook] Running without signature verification");
    }

    console.log(`[Billing Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.created":
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
