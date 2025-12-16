import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { customNumeric } from "../columns/numeric";

/**
 * Billing Plans
 * Defines available subscription plans and their credit allocations
 */
export const plans = pgTable("plans", {
  id: primaryUlid("plan"),
  name: varchar().notNull(), // "Starter", "Pro", "Agency"
  slug: varchar().notNull().unique(), // "starter", "pro", "agency"
  description: varchar(),

  // Stripe product/price IDs
  stripeProductId: varchar(),
  stripePriceIdMonthly: varchar(),
  stripePriceIdYearly: varchar(),

  // Pricing
  priceMonthly: integer().notNull().default(0), // cents
  priceYearly: integer().notNull().default(0), // cents

  // Credit allocations per month
  aiCreditsMonthly: integer().notNull().default(0), // AI (OpenAI/Claude) credits
  enrichmentCreditsMonthly: integer().notNull().default(0), // SignalHouse/data credits

  // Limits
  maxTeamMembers: integer().default(1),
  maxLeads: integer(),
  maxCampaigns: integer(),

  // Features
  features: jsonb().$type<string[]>(),

  // White-label (BYOK)
  allowByok: boolean().default(false),

  isActive: boolean().default(true),
  sortOrder: integer().default(0),
  createdAt,
  updatedAt,
});

/**
 * Team Subscriptions
 * Links teams to their Stripe subscription
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: primaryUlid("sub"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    planId: ulidColumn().references(() => plans.id),

    // Stripe subscription data
    stripeCustomerId: varchar(),
    stripeSubscriptionId: varchar(),
    stripePriceId: varchar(),

    // Status
    status: varchar().notNull().default("trialing"), // trialing, active, past_due, canceled, unpaid

    // Billing cycle
    billingCycle: varchar().default("monthly"), // monthly, yearly
    currentPeriodStart: timestamp(),
    currentPeriodEnd: timestamp(),
    cancelAtPeriodEnd: boolean().default(false),
    canceledAt: timestamp(),

    // Trial
    trialStart: timestamp(),
    trialEnd: timestamp(),

    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.teamId),
    index().on(t.stripeCustomerId),
    index().on(t.stripeSubscriptionId),
  ],
);

/**
 * Credit Balances (Wallet)
 * Tracks credit balance per team per credit type
 */
export const creditBalances = pgTable(
  "credit_balances",
  {
    id: primaryUlid("cb"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // Credit type: "ai" (OpenAI/Claude), "enrichment" (SignalHouse), "sms", "email"
    creditType: varchar().notNull(),

    // Balance
    balance: integer().notNull().default(0),

    // Monthly allocation tracking
    monthlyAllocation: integer().default(0),
    usedThisMonth: integer().default(0),
    allocationResetAt: timestamp(),

    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex().on(t.teamId, t.creditType),
    index().on(t.teamId),
  ],
);

/**
 * Credit Transactions
 * Audit log of all credit changes (debits/credits)
 */
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: primaryUlid("ctx"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    creditType: varchar().notNull(),

    // Transaction details
    amount: integer().notNull(), // positive = credit, negative = debit
    balanceBefore: integer().notNull(),
    balanceAfter: integer().notNull(),

    // What triggered this
    transactionType: varchar().notNull(), // "subscription", "purchase", "usage", "refund", "adjustment", "monthly_reset"

    // Reference to what used credits
    referenceType: varchar(), // "ai_call", "enrichment", "sms", "email"
    referenceId: varchar(), // ID of the specific call/message

    // For Stripe purchases
    stripePaymentIntentId: varchar(),

    description: varchar(),
    metadata: jsonb(),
    createdAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.teamId, t.creditType),
    index().on(t.createdAt),
  ],
);

/**
 * API Usage Tracking
 * Detailed usage metrics per API call
 */
export const apiUsage = pgTable(
  "api_usage",
  {
    id: primaryUlid("usage"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),

    // What was called
    service: varchar().notNull(), // "openai", "anthropic", "signalhouse", "twilio"
    endpoint: varchar(), // specific endpoint called

    // Usage metrics
    creditsUsed: integer().notNull().default(1),
    tokensInput: integer(), // for AI calls
    tokensOutput: integer(), // for AI calls

    // Cost tracking (what we paid the provider)
    costCents: integer(), // actual cost in cents

    // Response info
    success: boolean().default(true),
    errorMessage: varchar(),
    responseTimeMs: integer(),

    metadata: jsonb(),
    createdAt,
  },
  (t) => [
    index().on(t.teamId),
    index().on(t.teamId, t.service),
    index().on(t.createdAt),
  ],
);

/**
 * Credit Packs (Pay-as-you-go purchases)
 * Available credit packs for one-time purchase
 */
export const creditPacks = pgTable("credit_packs", {
  id: primaryUlid("pack"),
  name: varchar().notNull(), // "100 AI Credits", "500 Enrichments"
  creditType: varchar().notNull(), // "ai", "enrichment"
  creditAmount: integer().notNull(),

  // Stripe
  stripePriceId: varchar(),
  priceInCents: integer().notNull(),

  // Display
  description: varchar(),
  isPopular: boolean().default(false),
  isActive: boolean().default(true),
  sortOrder: integer().default(0),

  createdAt,
  updatedAt,
});
