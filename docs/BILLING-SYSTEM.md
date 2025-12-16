# Billing & Credit System Architecture

## Overview

The platform operates on a **credit-based billing model** where users purchase credits to consume API services (AI, enrichment, SMS, email). This enables:

1. **Predictable pricing** for customers
2. **Usage tracking** per team
3. **Flexible payment options** (subscription + one-time purchases)
4. **White-label support** with BYOK (Bring Your Own Keys) option

---

## Business Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER TIERS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐     ┌──────────────────────┐                  │
│  │   NEXTIER USERS      │     │   WHITE-LABEL        │                  │
│  │   (Platform Users)   │     │   (OutreachGlobal)   │                  │
│  ├──────────────────────┤     ├──────────────────────┤                  │
│  │ • Pay via Stripe     │     │ • Pay via Stripe     │                  │
│  │ • Use pooled API keys│     │   OR                 │                  │
│  │ • Credit deduction   │     │ • BYOK (own keys)    │                  │
│  │ • Monthly plans      │     │ • No credit deduct   │                  │
│  │                      │     │   if BYOK enabled    │                  │
│  └──────────────────────┘     └──────────────────────┘                  │
│                                                                          │
│  Users can graduate from Nextier → White-label ownership model          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Credit Types

| Type | Purpose | Services |
|------|---------|----------|
| `ai` | AI/LLM operations | OpenAI (GPT), Anthropic (Claude) |
| `enrichment` | Data enrichment | RealEstateAPI (skip tracing), Apollo |
| `sms` | Text messaging | SignalHouse.io, Twilio |
| `email` | Email operations | SendGrid |

---

## System Components

### 1. Database Schema (`apps/api/src/database/schema/billing.schema.ts`)

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│     plans       │     │   subscriptions     │     │  credit_balances │
├─────────────────┤     ├─────────────────────┤     ├──────────────────┤
│ id              │────▶│ plan_id             │     │ team_id          │
│ name            │     │ team_id             │────▶│ credit_type      │
│ stripe_price_id │     │ stripe_customer_id  │     │ balance          │
│ ai_credits      │     │ stripe_subscription │     │ used_this_month  │
│ enrichment_cred │     │ status              │     └──────────────────┘
└─────────────────┘     │ current_period_end  │
                        └─────────────────────┘
                                  │
                                  ▼
┌─────────────────────┐     ┌─────────────────────┐
│ credit_transactions │     │     api_usage       │
├─────────────────────┤     ├─────────────────────┤
│ team_id             │     │ team_id             │
│ credit_type         │     │ service             │
│ amount (+/-)        │     │ endpoint            │
│ transaction_type    │     │ credits_used        │
│ stripe_payment_id   │     │ success             │
│ reference_type/id   │     │ metadata            │
└─────────────────────┘     └─────────────────────┘
```

### 2. Credit Service (`apps/api/src/app/billing/services/credit.service.ts`)

Core service for all credit operations:

```typescript
// Check balance
await creditService.getBalance(teamId, "enrichment");

// Check if team has enough credits
await creditService.hasCredits(teamId, "ai", 10);

// Deduct credits (before API call)
await creditService.deductCredits({
  teamId,
  creditType: "enrichment",
  amount: 1,
  referenceType: "skiptrace",
  referenceId: personaId,
});

// Add credits (purchase, subscription, refund)
await creditService.addCredits({
  teamId,
  creditType: "ai",
  amount: 1000,
  transactionType: "subscription",
});

// Check BYOK status
const isByok = await creditService.isUsingByok(teamId);

// Track usage for analytics
await creditService.trackUsage({
  teamId,
  service: "realestateapi",
  endpoint: "skiptrace",
  creditsUsed: 1,
  success: true,
});
```

### 3. Stripe Service (`apps/api/src/app/billing/services/stripe.service.ts`)

Handles all Stripe interactions:

- **Checkout Sessions** - Subscription and one-time purchases
- **Billing Portal** - Customer self-service
- **Webhooks** - Automated credit allocation

### 4. Webhook Flow

```
┌──────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Stripe  │────▶│ /webhooks/stripe    │────▶│ StripeService   │
└──────────┘     │ (POST)              │     │ handleWebhook() │
                 └─────────────────────┘     └────────┬────────┘
                                                      │
                 ┌────────────────────────────────────┼────────────────────┐
                 │                                    │                    │
                 ▼                                    ▼                    ▼
   ┌─────────────────────┐          ┌─────────────────────┐   ┌───────────────┐
   │ checkout.completed  │          │ invoice.paid        │   │ subscription  │
   │ (credit pack)       │          │ (renewal)           │   │ .deleted      │
   ├─────────────────────┤          ├─────────────────────┤   ├───────────────┤
   │ Add purchased       │          │ Add monthly plan    │   │ Cancel sub    │
   │ credits to team     │          │ credits to team     │   │ Mark canceled │
   └─────────────────────┘          └─────────────────────┘   └───────────────┘
```

---

## Credit Flow: Skip Trace Example

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SKIP TRACE ENRICHMENT FLOW                            │
└──────────────────────────────────────────────────────────────────────────┘

1. Job queued to BullMQ "skiptrace" queue
                    │
                    ▼
2. SkipTraceConsumer picks up job
                    │
                    ▼
3. Check BYOK status ─────────────────────────┐
   │                                          │
   │ (not BYOK)                               │ (BYOK enabled)
   ▼                                          ▼
4. Check credits ────────────────────────► Skip credit check
   │                                          │
   │ (has credits)      (no credits)          │
   ▼                    ▼                     │
5. Deduct 1 credit    Return error:           │
   │                  INSUFFICIENT_CREDITS    │
   │                                          │
   ▼                                          │
6. Call RealEstateAPI skip trace ◄────────────┘
   │
   │ (success)              (failure)
   ▼                        ▼
7. Track usage            Refund credit (unless NO_MATCH)
   Return result          Track failed usage
                          Throw for retry
```

---

## API Endpoints

### GraphQL (apps/api/src/app/billing/resolvers/billing.resolver.ts)

```graphql
# Queries
query {
  creditBalances {
    ai
    enrichment
    sms
    email
  }

  checkCredits(creditType: ENRICHMENT, amount: 10) {
    hasCredits
    balance
    required
  }
}

# Mutations
mutation {
  createSubscriptionCheckout(input: {
    planId: "plan_starter"
    successUrl: "https://app.com/success"
    cancelUrl: "https://app.com/cancel"
  }) {
    sessionId
    url
  }

  createCreditPackCheckout(input: {
    packId: "pack_1000_ai"
    successUrl: "https://app.com/success"
    cancelUrl: "https://app.com/cancel"
  }) {
    sessionId
    url
  }

  createBillingPortalSession(returnUrl: "https://app.com/billing")
}
```

### REST (apps/api/src/app/billing/controllers/billing.controller.ts)

```
GET  /billing/credits           - Get all credit balances
GET  /billing/credits/:type     - Get specific credit balance
POST /billing/checkout          - Create checkout session
POST /billing/portal            - Create billing portal session
```

### Webhooks

```
POST /webhooks/stripe           - Stripe webhook endpoint (no auth, signature verified)
```

---

## Guards & Decorators

### Credit Guard (`apps/api/src/app/billing/guards/credit.guard.ts`)

Protect endpoints that require credits:

```typescript
@RequireCredits("enrichment", 1)
@Post("enrich")
async enrichLead() {
  // Only executes if team has 1+ enrichment credits
}
```

### Auth Guard

All billing endpoints use `@UseAuthGuard()` to require authentication.

---

## External Services Integration

| Service | Purpose | Credit Type | Env Variable |
|---------|---------|-------------|--------------|
| RealEstateAPI | Skip tracing | `enrichment` | `REALESTATE_API_KEY` |
| SignalHouse.io | SMS messaging | `sms` | `SIGNALHOUSE_API_KEY` |
| OpenAI | GPT AI | `ai` | `OPENAI_API_KEY` |
| Anthropic | Claude AI | `ai` | `ANTHROPIC_API_KEY` |
| Twilio | SMS/Voice | `sms` | `TWILIO_*` |
| SendGrid | Email | `email` | `SENDGRID_API_KEY` |
| Apollo | B2B enrichment | `enrichment` | `APOLLO_API_KEY` |

---

## BYOK (Bring Your Own Keys)

White-label customers can provide their own API keys:

```typescript
// In team_settings table
{
  teamId: "team_xyz",
  byokEnabled: true,
  byokKeys: {
    openai: "sk-...",
    anthropic: "sk-ant-...",
    realestateapi: "...",
  }
}
```

When BYOK is enabled:
1. No credits are deducted
2. Customer's own API keys are used
3. Usage is still tracked for analytics
4. Customer manages their own API costs

---

## Environment Variables

```env
# Stripe (required for billing)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# API Services (platform keys)
REALESTATE_API_KEY=xxx        # Skip tracing
SIGNALHOUSE_API_KEY=xxx       # SMS
OPENAI_API_KEY=sk-xxx         # AI
ANTHROPIC_API_KEY=sk-ant-xxx  # AI
```

---

## Database Migrations

Run migrations to create billing tables:

```bash
pnpm --filter api db:migrate
```

Tables created:
- `plans` - Subscription plans
- `subscriptions` - Team subscriptions
- `credit_balances` - Current credit balances per team
- `credit_transactions` - Credit transaction history
- `credit_packs` - One-time purchase packs
- `api_usage` - Usage analytics

---

## Quick Start

1. **Set environment variables** (Stripe keys, API keys)
2. **Run migrations** to create billing tables
3. **Seed plans** in the `plans` table
4. **Configure Stripe webhook** pointing to `/webhooks/stripe`
5. **Start the API** - billing system is ready

For testing without Stripe, manually add credits:

```sql
INSERT INTO credit_balances (team_id, credit_type, balance)
VALUES ('team_xxx', 'enrichment', 1000);
```
