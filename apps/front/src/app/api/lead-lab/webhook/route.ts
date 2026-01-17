/**
 * Lead Lab Stripe Webhook
 *
 * POST /api/lead-lab/webhook - Handle Stripe payment events
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateAssessmentJob, getAssessmentJob } from "../assess/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[Lead Lab Webhook] Signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`[Lead Lab Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(
          `[Lead Lab Webhook] Payment failed: ${paymentIntent.id}`,
          paymentIntent.last_payment_error?.message
        );
        break;
      }

      default:
        console.log(`[Lead Lab Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Lead Lab Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const assessmentId = session.metadata?.assessmentId;
  const email = session.metadata?.email;

  if (!assessmentId) {
    console.error("[Lead Lab Webhook] No assessmentId in session metadata");
    return;
  }

  console.log(`[Lead Lab Webhook] Payment complete for assessment ${assessmentId}`);

  // Get the job and start processing
  const job = await getAssessmentJob(assessmentId);
  if (!job) {
    console.error(`[Lead Lab Webhook] Job not found: ${assessmentId}`);
    return;
  }

  // Update status to processing
  await updateAssessmentJob(assessmentId, { status: "pending" });

  // Trigger async processing
  // In production, this would be a queue job
  processAssessmentAsync(assessmentId).catch(console.error);
}

// Import the processing function from assess route
async function processAssessmentAsync(assessmentId: string): Promise<void> {
  // This is a simplified version - in production, use a shared processing module
  const { updateAssessmentJob, getAssessmentJob } = await import("../assess/route");

  const job = await getAssessmentJob(assessmentId);
  if (!job) return;

  try {
    await updateAssessmentJob(assessmentId, { status: "processing" });

    // Process the records
    const stats = await processRecords(job.records, job.tier);

    await updateAssessmentJob(assessmentId, {
      status: "complete",
      completedAt: new Date(),
      stats,
    });

    // Send email
    await sendAssessmentEmail(job.email, stats, job.tier, assessmentId);

    console.log(`[Lead Lab Webhook] Assessment ${assessmentId} complete`);
  } catch (error) {
    console.error(`[Lead Lab Webhook] Processing error:`, error);
    await updateAssessmentJob(assessmentId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Simplified versions for webhook handler
async function processRecords(records: Array<Record<string, string>>, tier: "free" | "paid") {
  const total = records.length;

  // Simulate grade distribution
  const gradeA = Math.floor(total * 0.15);
  const gradeB = Math.floor(total * 0.25);
  const gradeC = Math.floor(total * 0.30);
  const gradeD = Math.floor(total * 0.20);
  const gradeF = total - gradeA - gradeB - gradeC - gradeD;

  const contactableRate = ((gradeA + gradeB + gradeC) / total) * 100;

  return {
    total,
    gradeBreakdown: { A: gradeA, B: gradeB, C: gradeC, D: gradeD, F: gradeF },
    qualityBreakdown: { high: gradeA + gradeB, medium: gradeC, low: gradeD + gradeF },
    averageScore: Math.round(contactableRate * 0.8),
    contactableRate,
    litigatorRiskCount: Math.floor(total * 0.02),
    mobileCount: Math.floor(total * 0.65),
    landlineCount: Math.floor(total * 0.35),
    dataFormat: {
      validPhones: Math.floor(total * 0.90),
      invalidPhones: Math.floor(total * 0.10),
      validEmails: Math.floor(total * 0.80),
      invalidEmails: Math.floor(total * 0.20),
      missingNames: Math.floor(total * 0.05),
      duplicates: Math.floor(total * 0.03),
    },
    campaignReadiness: {
      smsReady: Math.floor(total * 0.55),
      callReady: Math.floor(total * 0.63),
      emailReady: Math.floor(total * 0.64),
      notReady: Math.floor(total * 0.10),
    },
  };
}

async function sendAssessmentEmail(
  email: string,
  stats: Record<string, unknown>,
  tier: "free" | "paid",
  assessmentId: string
) {
  console.log(`[Lead Lab Webhook] Sending email to ${email} for assessment ${assessmentId}`);
  // TODO: Implement actual email sending
}
