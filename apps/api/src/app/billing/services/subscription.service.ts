import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  plansTable,
  subscriptionsTable,
  creditsTable,
  teamsTable,
} from "@/database/schema-alias";
import { eq, and, lt, gte, sql } from "drizzle-orm";
import { addDays, differenceInDays, isAfter, isBefore } from "date-fns";

/**
 * SUBSCRIPTION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * Manages team subscriptions, trial periods, and billing status.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "expired";

export interface TrialStatus {
  isTrialing: boolean;
  isExpired: boolean;
  isActive: boolean;
  daysRemaining: number;
  trialStart: Date | null;
  trialEnd: Date | null;
  status: SubscriptionStatus;
  canAccessFeatures: boolean;
  needsUpgrade: boolean;
}

export interface SubscriptionWithPlan {
  id: string;
  teamId: string;
  planId: string;
  status: string;
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  plan?: {
    slug: string;
    name: string;
    limits: Record<string, any>;
  };
}

const TRIAL_DURATION_DAYS = 14;
const DEFAULT_PLAN_SLUG = "starter";

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Ensure billing tables exist on module init
   */
  async onModuleInit() {
    try {
      await this.ensureBillingTablesExist();
      await this.ensureStarterPlanExists();
    } catch (error: any) {
      this.logger.error("Failed to initialize billing tables:", error.message);
    }
  }

  /**
   * Create billing tables if they don't exist
   */
  private async ensureBillingTablesExist() {
    try {
      // Create plans table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS plans (
          id VARCHAR(26) PRIMARY KEY,
          slug VARCHAR NOT NULL UNIQUE,
          name VARCHAR NOT NULL,
          description VARCHAR,
          price_monthly INTEGER NOT NULL,
          price_yearly INTEGER NOT NULL,
          setup_fee INTEGER DEFAULT 0,
          limits JSONB,
          features JSONB,
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create subscriptions table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id VARCHAR(26) PRIMARY KEY,
          team_id VARCHAR(26) NOT NULL,
          plan_id VARCHAR(26) NOT NULL REFERENCES plans(id),
          stripe_customer_id VARCHAR,
          stripe_subscription_id VARCHAR,
          stripe_price_id VARCHAR,
          status VARCHAR NOT NULL DEFAULT 'trialing',
          billing_cycle VARCHAR NOT NULL DEFAULT 'monthly',
          current_period_start TIMESTAMP,
          current_period_end TIMESTAMP,
          trial_start TIMESTAMP,
          trial_end TIMESTAMP,
          cancel_at_period_end BOOLEAN DEFAULT false,
          canceled_at TIMESTAMP,
          cancel_reason VARCHAR,
          usage_this_period JSONB,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create credits table
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS credits (
          id VARCHAR(26) PRIMARY KEY,
          team_id VARCHAR(26) NOT NULL,
          credit_type VARCHAR NOT NULL,
          balance INTEGER NOT NULL DEFAULT 0,
          total_purchased INTEGER DEFAULT 0,
          total_used INTEGER DEFAULT 0,
          expires_at TIMESTAMP,
          source VARCHAR,
          payment_id VARCHAR(26),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      this.logger.log("Billing tables verified/created");
    } catch (error: any) {
      this.logger.error("Error creating billing tables:", error.message);
      throw error;
    }
  }

  /**
   * Ensure starter plan exists
   */
  private async ensureStarterPlanExists() {
    try {
      // Use raw SQL to check if plan exists (more reliable than query API during init)
      const result = await this.db.execute(
        sql`SELECT id FROM plans WHERE slug = ${DEFAULT_PLAN_SLUG} LIMIT 1`,
      );
      const existing = result.rows?.[0];

      if (!existing) {
        // Use onConflictDoNothing to handle race conditions during startup
        await this.db
          .insert(plansTable)
          .values({
            slug: DEFAULT_PLAN_SLUG,
            name: "Starter",
            priceMonthly: 9900,
            priceYearly: 99000,
            limits: {
              users: 3,
              leads: 5000,
              searches: 500,
              sms: 1000,
              skipTraces: 100,
              apiAccess: false,
              powerDialer: true,
              whiteLabel: false,
            },
            features: [
              { text: "Up to 5,000 leads", included: true },
              { text: "1,000 SMS/month", included: true },
              { text: "Power Dialer", included: true },
              { text: "3 Team Members", included: true },
              { text: "Email Support", included: true },
            ],
            isActive: true,
            sortOrder: 1,
          })
          .onConflictDoNothing();
        this.logger.log("Created starter plan (or already exists)");
      } else {
        this.logger.log("Starter plan already exists");
      }
    } catch (error: any) {
      this.logger.error(
        `Error ensuring starter plan: ${error?.message || error}`,
        error?.stack,
      );
    }
  }

  /**
   * Create a new subscription for a team (called during registration)
   */
  async createTrialSubscription(teamId: string): Promise<SubscriptionWithPlan> {
    const now = new Date();
    const trialEnd = addDays(now, TRIAL_DURATION_DAYS);

    // Find the starter plan
    let plan = await this.db.query.plans.findFirst({
      where: (t, { eq }) => eq(t.slug, DEFAULT_PLAN_SLUG),
    });

    // Create starter plan if it doesn't exist (use ON CONFLICT to handle race conditions)
    if (!plan) {
      const [newPlan] = await this.db
        .insert(plansTable)
        .values({
          slug: DEFAULT_PLAN_SLUG,
          name: "Starter",
          priceMonthly: 9900, // $99/month
          priceYearly: 99000, // $990/year
          limits: {
            users: 3,
            leads: 5000,
            searches: 500,
            sms: 1000,
            skipTraces: 100,
            apiAccess: false,
            powerDialer: true,
            whiteLabel: false,
          },
          features: [
            { text: "Up to 5,000 leads", included: true },
            { text: "1,000 SMS/month", included: true },
            { text: "Power Dialer", included: true },
            { text: "3 Team Members", included: true },
            { text: "Email Support", included: true },
          ],
          isActive: true,
          sortOrder: 1,
        })
        .onConflictDoNothing()
        .returning();

      // If insert returned nothing due to conflict, fetch existing plan
      if (!newPlan) {
        plan = await this.db.query.plans.findFirst({
          where: (t, { eq }) => eq(t.slug, DEFAULT_PLAN_SLUG),
        });
      } else {
        plan = newPlan;
      }
    }

    // Create the subscription
    const [subscription] = await this.db
      .insert(subscriptionsTable)
      .values({
        teamId,
        planId: plan.id,
        status: "trialing",
        billingCycle: "monthly",
        trialStart: now,
        trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        usageThisPeriod: {
          leads: 0,
          searches: 0,
          sms: 0,
          skipTraces: 0,
        },
      })
      .returning();

    // Give trial credits
    await this.db.insert(creditsTable).values({
      teamId,
      creditType: "general",
      balance: 100, // 100 trial credits
      totalPurchased: 100,
      totalUsed: 0,
      source: "trial",
      expiresAt: trialEnd,
    });

    return {
      ...subscription,
      plan: {
        slug: plan.slug,
        name: plan.name,
        limits: plan.limits as Record<string, any>,
      },
    };
  }

  /**
   * Get subscription for a team
   */
  async getSubscription(teamId: string): Promise<SubscriptionWithPlan | null> {
    const subscription = await this.db.query.subscriptions.findFirst({
      where: (t, { eq }) => eq(t.teamId, teamId),
    });

    if (!subscription) return null;

    const plan = await this.db.query.plans.findFirst({
      where: (t, { eq }) => eq(t.id, subscription.planId),
    });

    return {
      ...subscription,
      plan: plan
        ? {
            slug: plan.slug,
            name: plan.name,
            limits: plan.limits as Record<string, any>,
          }
        : undefined,
    };
  }

  /**
   * Get detailed trial status for a team
   */
  async getTrialStatus(teamId: string): Promise<TrialStatus> {
    const subscription = await this.getSubscription(teamId);
    const now = new Date();

    // No subscription = expired/needs setup
    if (!subscription) {
      return {
        isTrialing: false,
        isExpired: true,
        isActive: false,
        daysRemaining: 0,
        trialStart: null,
        trialEnd: null,
        status: "expired",
        canAccessFeatures: false,
        needsUpgrade: true,
      };
    }

    const status = subscription.status as SubscriptionStatus;
    const trialEnd = subscription.trialEnd;
    const isTrialing = status === "trialing";
    const isActive = status === "active";

    // Calculate days remaining
    let daysRemaining = 0;
    let isExpired = false;

    if (isTrialing && trialEnd) {
      if (isAfter(now, trialEnd)) {
        isExpired = true;
        daysRemaining = 0;
      } else {
        daysRemaining = differenceInDays(trialEnd, now);
      }
    }

    // Determine feature access
    // - Active paid subscription: full access
    // - Trialing (not expired): full access
    // - Expired trial: no access (upgrade wall)
    // - Past due: limited access (grace period)
    const canAccessFeatures =
      isActive || (isTrialing && !isExpired) || status === "past_due";

    const needsUpgrade =
      isExpired ||
      status === "expired" ||
      status === "unpaid" ||
      status === "canceled";

    return {
      isTrialing,
      isExpired,
      isActive,
      daysRemaining,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      status: isExpired ? "expired" : status,
      canAccessFeatures,
      needsUpgrade,
    };
  }

  /**
   * Check if a team can access features (quick check)
   */
  async canAccessFeatures(teamId: string): Promise<boolean> {
    const status = await this.getTrialStatus(teamId);
    return status.canAccessFeatures;
  }

  /**
   * Get teams with expiring trials (for reminder emails)
   */
  async getExpiringTrials(daysUntilExpiry: number): Promise<string[]> {
    const now = new Date();
    const targetDate = addDays(now, daysUntilExpiry);
    const nextDay = addDays(targetDate, 1);

    const results = await this.db
      .select({ teamId: subscriptionsTable.teamId })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.status, "trialing"),
          gte(subscriptionsTable.trialEnd, targetDate),
          lt(subscriptionsTable.trialEnd, nextDay),
        ),
      );

    return results.map((r) => r.teamId);
  }

  /**
   * Get all expired trials (for lockout processing)
   */
  async getExpiredTrials(): Promise<string[]> {
    const now = new Date();

    const results = await this.db
      .select({ teamId: subscriptionsTable.teamId })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.status, "trialing"),
          lt(subscriptionsTable.trialEnd, now),
        ),
      );

    return results.map((r) => r.teamId);
  }

  /**
   * Mark trial as expired
   */
  async expireTrial(teamId: string): Promise<void> {
    await this.db
      .update(subscriptionsTable)
      .set({ status: "expired" })
      .where(
        and(
          eq(subscriptionsTable.teamId, teamId),
          eq(subscriptionsTable.status, "trialing"),
        ),
      );
  }

  /**
   * Activate subscription (after payment)
   */
  async activateSubscription(
    teamId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
  ): Promise<void> {
    const now = new Date();
    const periodEnd = addDays(now, 30); // Monthly billing

    await this.db
      .update(subscriptionsTable)
      .set({
        status: "active",
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: null, // Clear trial
      })
      .where(eq(subscriptionsTable.teamId, teamId));
  }

  /**
   * Update subscription status (from Stripe webhook)
   */
  async updateStatus(
    teamId: string,
    status: SubscriptionStatus,
  ): Promise<void> {
    await this.db
      .update(subscriptionsTable)
      .set({ status })
      .where(eq(subscriptionsTable.teamId, teamId));
  }

  /**
   * Check usage against plan limits
   */
  async checkUsageLimit(
    teamId: string,
    usageType: "leads" | "searches" | "sms" | "skipTraces",
    quantity: number = 1,
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.getSubscription(teamId);

    if (!subscription || !subscription.plan?.limits) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const limits = subscription.plan.limits;
    const usage = (subscription as any).usageThisPeriod || {};
    const current = usage[usageType] || 0;
    const limit = limits[usageType] || 0;

    return {
      allowed: current + quantity <= limit,
      current,
      limit,
    };
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    teamId: string,
    usageType: "leads" | "searches" | "sms" | "skipTraces",
    quantity: number = 1,
  ): Promise<void> {
    await this.db
      .update(subscriptionsTable)
      .set({
        usageThisPeriod: sql`jsonb_set(
          COALESCE(usage_this_period, '{}'::jsonb),
          '{${sql.raw(usageType)}}',
          (COALESCE((usage_this_period->>'${sql.raw(usageType)}')::int, 0) + ${quantity})::text::jsonb
        )`,
      })
      .where(eq(subscriptionsTable.teamId, teamId));
  }
}
