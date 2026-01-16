import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from "@/lib/email";
import { Logger } from "@/lib/logger";

/**
 * TRIAL WARNING CRON JOB
 * ═══════════════════════════════════════════════════════════════════════════
 * GET /api/cron/trial-warnings - Send trial expiration warning emails
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This cron job should run daily (e.g., via Vercel Cron, GitHub Actions, etc.)
 * It sends emails to users whose trials are:
 *   - Expiring in 7 days
 *   - Expiring in 3 days
 *   - Expiring in 1 day
 *   - Expired (trial ended, no payment method)
 *
 * Setup (Vercel):
 *   Add to vercel.json:
 *   {
 *     "crons": [{
 *       "path": "/api/cron/trial-warnings",
 *       "schedule": "0 9 * * *"
 *     }]
 *   }
 *
 * Security:
 *   Verify the request is from your cron service using CRON_SECRET
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Warning intervals in days
const WARNING_DAYS = [7, 3, 1];

export async function GET(request: NextRequest) {
  // Verify cron secret (if configured)
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      Logger.warn("Cron", "Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const now = new Date();

    const stats = {
      totalTrialing: 0,
      warning7Days: 0,
      warning3Days: 0,
      warning1Day: 0,
      expired: 0,
      emailsSent: 0,
      errors: 0,
    };

    // Fetch all trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
      expand: ["data.customer"],
    });

    stats.totalTrialing = trialingSubscriptions.data.length;

    for (const subscription of trialingSubscriptions.data) {
      try {
        const customer = subscription.customer as Stripe.Customer;

        if (!customer || ("deleted" in customer && customer.deleted) || !customer.email) {
          continue;
        }

        const trialEnd = subscription.trial_end;
        if (!trialEnd) continue;

        const trialEndDate = new Date(trialEnd * 1000);
        const daysUntilExpiry = Math.ceil(
          (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Check if we should send a warning
        if (WARNING_DAYS.includes(daysUntilExpiry)) {
          const customerName = customer.name || "there";

          await sendTrialExpiringEmail(
            customer.email,
            customerName,
            daysUntilExpiry,
            "Pro", // Default plan name - could be from metadata
          );

          stats.emailsSent++;

          if (daysUntilExpiry === 7) stats.warning7Days++;
          else if (daysUntilExpiry === 3) stats.warning3Days++;
          else if (daysUntilExpiry === 1) stats.warning1Day++;

          Logger.info("Cron", "Sent trial warning email", {
            email: customer.email,
            daysLeft: daysUntilExpiry,
            subscriptionId: subscription.id,
          });
        }
      } catch (emailError) {
        stats.errors++;
        Logger.error("Cron", "Failed to send trial warning", {
          subscriptionId: subscription.id,
          error: emailError,
        });
      }
    }

    // Check for recently expired trials (last 24 hours)
    // These are subscriptions that were trialing but are now past_due or canceled
    const recentlyExpired = await stripe.subscriptions.list({
      status: "past_due",
      limit: 50,
      expand: ["data.customer"],
    });

    for (const subscription of recentlyExpired.data) {
      try {
        const customer = subscription.customer as Stripe.Customer;

        if (!customer || ("deleted" in customer && customer.deleted) || !customer.email) {
          continue;
        }

        // Check if this subscription was recently in trial (check metadata)
        const trialEnd = subscription.trial_end;
        if (!trialEnd) continue;

        const trialEndDate = new Date(trialEnd * 1000);
        const hoursSinceExpiry =
          (now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60);

        // Only send expired email if trial ended in last 24 hours
        if (hoursSinceExpiry > 0 && hoursSinceExpiry <= 24) {
          await sendTrialExpiredEmail(customer.email, customer.name || "there");

          stats.expired++;
          stats.emailsSent++;

          Logger.info("Cron", "Sent trial expired email", {
            email: customer.email,
            subscriptionId: subscription.id,
          });
        }
      } catch (emailError) {
        stats.errors++;
        Logger.error("Cron", "Failed to send trial expired email", {
          subscriptionId: subscription.id,
          error: emailError,
        });
      }
    }

    Logger.info("Cron", "Trial warning job completed", stats);

    return NextResponse.json({
      success: true,
      message: "Trial warning emails processed",
      stats,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    Logger.error("Cron", "Trial warning job failed", { error: error.message });
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 },
    );
  }
}

// POST for manual trigger (with authentication)
export async function POST(request: NextRequest) {
  // Same logic as GET but requires auth
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse GET logic
  return GET(request);
}
