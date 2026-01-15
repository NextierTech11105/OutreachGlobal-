import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Logger } from "@/lib/logger";

/**
 * UPDATE PAYMENT METHOD API
 * ═══════════════════════════════════════════════════════════════════════════
 * POST /api/billing/update-payment-method - Update customer's payment method
 * GET /api/billing/update-payment-method - Create SetupIntent for secure payment collection
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * IMPORTANT: For PCI compliance, card details should NEVER be sent directly to your server.
 * Instead, use Stripe Elements to collect card details client-side, then send the
 * payment method ID to this endpoint.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface UpdatePaymentRequest {
  customerId?: string;
  paymentMethodId: string; // From Stripe Elements
}

// GET - Create a SetupIntent for collecting payment details
export async function GET(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 },
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Create a SetupIntent for securely collecting payment details
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error: any) {
    Logger.error("Billing", "Failed to create SetupIntent", { error: error.message });
    return NextResponse.json(
      { error: error.message || "Failed to create payment setup" },
      { status: 500 },
    );
  }
}

// POST - Attach payment method and set as default
export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const body: UpdatePaymentRequest = await request.json();
    const { customerId, paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 },
      );
    }

    // In production, get customerId from authenticated user session
    let stripeCustomerId = customerId;

    if (!stripeCustomerId) {
      // TODO: Get from authenticated user's team
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 },
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    // Set as the default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Get payment method details for response
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    Logger.info("Billing", "Payment method updated", {
      customerId: stripeCustomerId,
      paymentMethodId,
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
    });

    return NextResponse.json({
      success: true,
      message: "Payment method updated successfully",
      paymentMethod: {
        id: paymentMethod.id,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        expMonth: paymentMethod.card?.exp_month,
        expYear: paymentMethod.card?.exp_year,
      },
    });
  } catch (error: any) {
    Logger.error("Billing", "Failed to update payment method", { error: error.message });

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return NextResponse.json(
        { error: error.message || "Card was declined" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update payment method" },
      { status: 500 },
    );
  }
}
