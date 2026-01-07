# AUDIT: ONBOARDING, PAYMENT & DEAD ROUTES

**CONTEXT**:
The system has a "Phantom" onboarding flow. The UI has buttons for Pricing/Stripe, but the Database has no Subscription tables.
The user reports:
1.  **Onboarding Audit Needed**: Specifically for "Owners" vs "Clients".
2.  **Stripe Integration**: Money is not moving.
3.  **404 Errors**: Pages link to nowhere (e.g., `/signup`).
4.  **Demo Logic**: Need "Email-based 30-day demo" support.

---

## SECTION 1: THE DISAPPEARING SIGNUP (404 Audit)
**Finding**: `apps/front/src/app/pricing/page.tsx` links to `router.push("/signup?plan=pro")`.
**Reality**: The `/signup` route **DOES NOT EXIST** in `apps/front/src/app`.
**Status**: 🚨 **CRITICAL 404**.

**Action Plan**:
1.  Run `ls apps/front/src/app` to confirm.
2.  **Fix**: Create `apps/front/src/app/auth/signup/page.tsx` or redirect `/signup` to `/auth/register` (if that exists).
3.  **Missing Pages Scan**:
    -   Scan all `router.push("...")` and `<Link href="...">` in `apps/front`.
    -   Compare against the file structure.
    -   Report all dead ends.

## SECTION 2: THE PHANTOM SUBSCRIPTION (Database Audit)
**Finding**: `apps/api/src/database/schema` contains `users`, `teams`, `leads`... but **NO** `subscriptions` or `payments`.
**Status**: 🚨 **CRITICAL ARCHITECTURE GAP**.

**Action Plan**:
1.  **Schema Migration**: Create `apps/api/src/database/schema/billing.schema.ts`.
    ```typescript
    export const subscriptions = pgTable("subscriptions", {
      id: primaryUlid("sub"),
      teamId: teamsRef().notNull(),
      stripeSubscriptionId: varchar().notNull(),
      stripeCustomerId: varchar().notNull(),
      status: varchar().notNull(), // active, trialing, past_due
      currentPeriodEnd: timestamp().notNull(),
      planId: varchar().notNull(), // 'starter', 'pro'
    });
    ```
2.  **Trial Logic**: Add `trialEndsAt` to `teams.schema.ts` (Managed by logic, not just Stripe).

## SECTION 3: THE "30-DAY DEMO" LOGIC
**Requirement**: "Email-based user 30 day demos".
**Current State**: No logic found in `users.schema.ts`.

**Action Plan**:
1.  **Migration**: Add `demo_expires_at` to `users` or `teams`.
    `demoExpiresAt: timestamp("demo_expires_at")`
2.  **Middleware**: In `apps/api/src/common/guards/auth.guard.ts`, check:
    ```typescript
    if (user.demoExpiresAt && user.demoExpiresAt < new Date() && !user.hasActiveSubscription) {
      throw new ForbiddenException("Demo Expired. Please Upgrade.");
    }
    ```
3.  **Cron Job**: `DemoExpirationWorker` that sends an email 3 days before expiry.

## SECTION 4: OWNER VS. CLIENT ONBOARDING
**Finding**: `users.schema.ts` has a simple `role` column.
**Requirement**: Distinct flows for "Paying Owner" vs "Invited Client".

**Action Plan**:
1.  **Owner Flow**: Signup -> Stripe Checkout -> Create Team -> Invite Members.
2.  **Client Flow**: Email Invite -> Set Password -> Auto-join Team (Skip Stripe).
3.  **Audit**: Check `apps/api/src/app/auth/auth.service.ts` to ensure "Invited Users" never see the Paywall.

---

**COMMAND FOR CLAUDE**:
"Read `docs/ONBOARDING_AND_ROUTING_AUDIT.md`.
First, fix the 404 error by creating the `/signup` route (redirecting to Auth).
Then, generate the Drizzle migration for the `subscriptions` table and the `demo_expires_at` column.
Finally, implement the Gateway Guard that blocks expired users."
