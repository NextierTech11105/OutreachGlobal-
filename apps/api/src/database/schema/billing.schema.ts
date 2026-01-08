import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { users } from "./users.schema";

/**
 * BILLING SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 * Handles subscriptions, payments, usage tracking for multi-tenant SaaS.
 * Integrates with Stripe for payment processing.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const SUBSCRIPTION_PK = "sub";
export const PAYMENT_PK = "pay";
export const USAGE_RECORD_PK = "usage";
export const INVOICE_PK = "inv";

// ═══════════════════════════════════════════════════════════════════════════
// PLANS - Available subscription tiers
// ═══════════════════════════════════════════════════════════════════════════
export const plans = pgTable("plans", {
  id: primaryUlid("plan"),
  slug: varchar().notNull().unique(), // starter, pro, agency, white-label
  name: varchar().notNull(),
  description: varchar(),
  
  // Pricing
  priceMonthly: integer("price_monthly").notNull(), // in cents
  priceYearly: integer("price_yearly").notNull(), // in cents
  setupFee: integer("setup_fee").default(0), // one-time fee in cents
  
  // Limits
  limits: jsonb().$type<{
    users: number;
    leads: number;
    searches: number;
    sms: number;
    skipTraces: number;
    apiAccess: boolean;
    powerDialer: boolean;
    whiteLabel: boolean;
  }>(),
  
  // Features list for display
  features: jsonb().$type<{ text: string; included: boolean }[]>(),
  
  // Status
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt,
  updatedAt,
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS - Team subscription to a plan
// ═══════════════════════════════════════════════════════════════════════════
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: primaryUlid(SUBSCRIPTION_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    planId: ulidColumn()
      .references(() => plans.id)
      .notNull(),
    
    // Stripe IDs
    stripeCustomerId: varchar("stripe_customer_id"),
    stripeSubscriptionId: varchar("stripe_subscription_id"),
    stripePriceId: varchar("stripe_price_id"),
    
    // Status
    status: varchar().notNull().default("trialing"), 
    // trialing, active, past_due, canceled, unpaid, incomplete
    
    // Billing cycle
    billingCycle: varchar("billing_cycle").notNull().default("monthly"), // monthly, yearly
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    
    // Trial
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    
    // Cancellation
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    canceledAt: timestamp("canceled_at"),
    cancelReason: varchar("cancel_reason"),
    
    // Usage this period
    usageThisPeriod: jsonb("usage_this_period").$type<{
      leads: number;
      searches: number;
      sms: number;
      skipTraces: number;
    }>(),
    
    // Metadata
    metadata: jsonb().$type<Record<string, any>>(),
    
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index("subscriptions_stripe_customer_idx").on(t.stripeCustomerId),
    index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
    index("subscriptions_status_idx").on(t.status),
  ]
);

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS - Payment history
// ═══════════════════════════════════════════════════════════════════════════
export const payments = pgTable(
  "payments",
  {
    id: primaryUlid(PAYMENT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    subscriptionId: ulidColumn().references(() => subscriptions.id),
    
    // Stripe IDs
    stripePaymentIntentId: varchar("stripe_payment_intent_id"),
    stripeInvoiceId: varchar("stripe_invoice_id"),
    stripeChargeId: varchar("stripe_charge_id"),
    
    // Amount
    amount: integer().notNull(), // in cents
    currency: varchar().notNull().default("usd"),
    
    // Status
    status: varchar().notNull(), // succeeded, pending, failed, refunded
    
    // Details
    description: varchar(),
    paymentMethod: varchar("payment_method"), // card, bank_transfer, etc
    cardLast4: varchar("card_last4"),
    cardBrand: varchar("card_brand"),
    
    // Failure info
    failureCode: varchar("failure_code"),
    failureMessage: varchar("failure_message"),
    
    // Refund info
    refundedAmount: integer("refunded_amount").default(0),
    refundedAt: timestamp("refunded_at"),
    
    // Metadata
    metadata: jsonb().$type<Record<string, any>>(),
    
    paidAt: timestamp("paid_at"),
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index("payments_subscription_idx").on(t.subscriptionId),
    index("payments_stripe_pi_idx").on(t.stripePaymentIntentId),
  ]
);

// ═══════════════════════════════════════════════════════════════════════════
// USAGE RECORDS - Track billable usage
// ═══════════════════════════════════════════════════════════════════════════
export const usageRecords = pgTable(
  "usage_records",
  {
    id: primaryUlid(USAGE_RECORD_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    subscriptionId: ulidColumn().references(() => subscriptions.id),
    
    // What was used
    usageType: varchar("usage_type").notNull(), 
    // sms, skip_trace, search, api_call, lead_import
    
    // How much
    quantity: integer().notNull().default(1),
    unitCost: numeric("unit_cost", { precision: 10, scale: 4 }), // cost per unit
    totalCost: numeric("total_cost", { precision: 10, scale: 2 }), // total cost
    
    // Context
    resourceId: varchar("resource_id"), // lead ID, campaign ID, etc
    resourceType: varchar("resource_type"), // lead, campaign, etc
    description: varchar(),
    
    // Billing period this applies to
    billingPeriodStart: timestamp("billing_period_start"),
    billingPeriodEnd: timestamp("billing_period_end"),
    
    // Whether this has been billed
    billed: boolean().default(false),
    billedAt: timestamp("billed_at"),
    invoiceId: ulidColumn("invoice_id"),
    
    // Metadata
    metadata: jsonb().$type<Record<string, any>>(),
    
    createdAt,
  },
  (t) => [
    index().on(t.teamId),
    index("usage_records_type_idx").on(t.usageType),
    index("usage_records_billed_idx").on(t.billed),
    index("usage_records_period_idx").on(t.billingPeriodStart, t.billingPeriodEnd),
  ]
);

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES - Generated invoices
// ═══════════════════════════════════════════════════════════════════════════
export const invoices = pgTable(
  "invoices",
  {
    id: primaryUlid(INVOICE_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    subscriptionId: ulidColumn().references(() => subscriptions.id),
    
    // Stripe
    stripeInvoiceId: varchar("stripe_invoice_id"),
    stripeInvoiceUrl: varchar("stripe_invoice_url"),
    stripePdfUrl: varchar("stripe_pdf_url"),
    
    // Invoice details
    invoiceNumber: varchar("invoice_number"),
    status: varchar().notNull(), // draft, open, paid, void, uncollectible
    
    // Amounts
    subtotal: integer().notNull(), // in cents
    tax: integer().default(0),
    total: integer().notNull(),
    amountPaid: integer("amount_paid").default(0),
    amountDue: integer("amount_due"),
    
    // Currency
    currency: varchar().notNull().default("usd"),
    
    // Dates
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),
    voidedAt: timestamp("voided_at"),
    
    // Line items
    lineItems: jsonb("line_items").$type<{
      description: string;
      quantity: number;
      unitAmount: number;
      amount: number;
    }[]>(),
    
    // Metadata
    metadata: jsonb().$type<Record<string, any>>(),
    
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index("invoices_stripe_idx").on(t.stripeInvoiceId),
    index("invoices_status_idx").on(t.status),
  ]
);

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT METHODS - Stored payment methods
// ═══════════════════════════════════════════════════════════════════════════
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: primaryUlid("pm"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    
    // Stripe
    stripePaymentMethodId: varchar("stripe_payment_method_id").notNull(),
    
    // Type
    type: varchar().notNull(), // card, bank_account, etc
    
    // Card details (if card)
    cardBrand: varchar("card_brand"),
    cardLast4: varchar("card_last4"),
    cardExpMonth: integer("card_exp_month"),
    cardExpYear: integer("card_exp_year"),
    
    // Bank details (if bank)
    bankName: varchar("bank_name"),
    bankLast4: varchar("bank_last4"),
    
    // Status
    isDefault: boolean("is_default").default(false),
    
    // Billing address
    billingName: varchar("billing_name"),
    billingEmail: varchar("billing_email"),
    billingAddress: jsonb("billing_address").$type<{
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }>(),
    
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index("payment_methods_stripe_idx").on(t.stripePaymentMethodId),
  ]
);

// ═══════════════════════════════════════════════════════════════════════════
// CREDITS - Pre-paid credits (for pay-as-you-go usage)
// ═══════════════════════════════════════════════════════════════════════════
export const credits = pgTable(
  "credits",
  {
    id: primaryUlid("cred"),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    
    // Credit type
    creditType: varchar("credit_type").notNull(), // sms, skip_trace, general
    
    // Balance
    balance: integer().notNull().default(0), // remaining credits
    totalPurchased: integer("total_purchased").default(0),
    totalUsed: integer("total_used").default(0),
    
    // Expiration
    expiresAt: timestamp("expires_at"),
    
    // Source
    source: varchar(), // purchase, promo, referral, trial
    paymentId: ulidColumn("payment_id").references(() => payments.id),
    
    createdAt,
    updatedAt,
  },
  (t) => [
    index().on(t.teamId),
    index("credits_type_idx").on(t.creditType),
  ]
);
