# WHITE_LABEL_EXECUTION_PLAN.md

This document is an **execution plan** for hardening `outreach-monorepo` into a **DigitalOcean-only**, **white-label**, **multi-tenant SaaS** with strong tenant isolation and cost containment. It is written to be executed by another AI agent (Claude Code) with minimal additional auditing.

**Constraints (must follow):**
- Do not refactor for style/architecture.
- Do not rename folders or “clean up” broadly.
- Treat external APIs as **cost-bearing** and require explicit safeguards.
- Treat “tenant isolation” as **non-negotiable** for white-label resale.

**Repo stack (observed):**
- TypeScript monorepo with Nx and pnpm.
- NestJS backend: `apps/api`
- Next.js frontend (and many API routes): `apps/front`
- Drizzle ORM in both layers (different schemas/clients).
- BullMQ jobs/consumers in Nest.
- DigitalOcean Functions: `functions/`

---

# 1. Repo Overview

## High-level system description

This repo contains **two server stacks** plus **DigitalOcean Functions**:

- **NestJS backend** (`apps/api`): GraphQL-first service with BullMQ workers, Drizzle ORM (Postgres), and integrations (RealEstateAPI, Apollo, Twilio, SendGrid). Entry: `apps/api/src/main.ts:1`.
- **Next.js frontend** (`apps/front`): UI plus many Next.js API routes under `apps/front/src/app/api/**/route.ts`. It uses Clerk for auth in some endpoints and accesses Postgres via Drizzle (Neon HTTP driver) in others (`apps/front/src/lib/db.ts:1`).
- **DigitalOcean Functions** (`functions/`): serverless handlers for webhooks, enrichment, and CSV processing. Example: `functions/packages/data/csv-processor/index.js:94`.

## Primary execution paths (what runs in production)

1) **User UI → Next.js**
- Pages under `apps/front/src/app/**`.
- API routes under `apps/front/src/app/api/**/route.ts` for CRM operations, campaigns, enrichment pipelines, SignalHouse, etc.

2) **Next.js → NestJS**
- Some Next.js routes call the NestJS GraphQL endpoint (example: `apps/front/src/app/api/leads/bulk-create/route.ts:63`).

3) **NestJS → Postgres**
- NestJS uses Drizzle schemas in `apps/api/src/database/schema/*.ts` and scopes most business entities by `teamId` (example: leads include required `teamId` at `apps/api/src/database/schema/leads.schema.ts:20`).

4) **Background jobs**
- BullMQ configured in `apps/api/src/app/app.module.ts:50` with prefix `apps/api/src/app/app.module.ts:56`.
- Consumers: e.g. `apps/api/src/app/enrichment/consumers/skiptrace.consumer.ts`.
- Schedules: `apps/api/src/app/lead/schedules/lead.schedule.ts`.

5) **DigitalOcean Functions**
- CSV processing from DO Spaces: `functions/packages/data/csv-processor/index.js:94`.
- Enrichment: `functions/packages/enrichment/enrich-lead/index.js:1`, `functions/packages/enrichment/batch-enrich/index.js:1`.
- Webhooks: `functions/packages/webhooks/sms-inbound/index.js:1`.

## Entry points

### NestJS API
- HTTP server bootstrap: `apps/api/src/main.ts:1`
- Module wiring (BullMQ/GraphQL/etc): `apps/api/src/app/app.module.ts:1`
- Auth guard (JWT-based): `apps/api/src/app/auth/guards/auth.guard.ts:1`

### Next.js
- DB client: `apps/front/src/lib/db.ts:1`
- DB schema: `apps/front/src/lib/db/schema.ts:19` (buckets) and `apps/front/src/lib/db/schema.ts:57` (leads)
- Example authenticated API route (Clerk): `apps/front/src/app/api/leads/route.ts:21`
- Example unauthenticated high-risk API routes (see Tenant/Failure sections):
  - Deals: `apps/front/src/app/api/deals/route.ts:18`
  - Machine orchestrator: `apps/front/src/app/api/machine/route.ts:73`
  - Bucket processing: `apps/front/src/app/api/property/bucket/process/route.ts:34`
  - Billing usage: `apps/front/src/app/api/billing/usage/route.ts:49`
  - B2B enrichment: `apps/front/src/app/api/b2b/enrich/route.ts:14`

---

# 2. Execution Tier Map

The tiers below are used to control change risk. **Tier 0 changes require the strictest validation** and should be done first, with rollback readiness.

## Tier 0: Runtime Hot Path

**Why:** These files execute on every request / webhook / job tick. Mistakes here cause outages, tenant data leaks, and unexpected spend.

- `apps/api/src/main.ts`
  - NestJS server entrypoint.
- `apps/api/src/app/app.module.ts`
  - Global wiring for GraphQL, BullMQ, throttling, etc. (BullMQ init: `apps/api/src/app/app.module.ts:50`).
- `apps/api/src/app/auth/guards/auth.guard.ts`
  - Auth gate; populates `request["user"]` (`apps/api/src/app/auth/guards/auth.guard.ts:44`).
- `apps/api/src/app/**/resolvers/*.ts`
  - GraphQL hot path (example: `apps/api/src/app/lead/resolvers/lead.resolver.ts:57`).
- `apps/api/src/app/**/controllers/*.ts`
  - REST hot path (example: `apps/api/src/app/lead/controllers/business-list.controller.ts:1`).
- `apps/api/src/app/**/consumers/*.consumer.ts`
  - BullMQ processors (e.g. `apps/api/src/app/enrichment/consumers/skiptrace.consumer.ts:1`).
- `apps/api/src/app/**/schedules/*.schedule.ts`
  - Scheduled jobs (e.g. `apps/api/src/app/lead/schedules/lead.schedule.ts:1`).
- `apps/front/src/app/api/**/route.ts`
  - Next.js API routes are hot-path and include DB mutations + vendor calls.
- `apps/front/src/app/api/webhook/signalhouse/route.ts`
  - Webhook ingestion; currently stores state in memory (`apps/front/src/app/api/webhook/signalhouse/route.ts:37`).
- `functions/packages/**/index.js`
  - DigitalOcean Functions execute in production (CSV, enrichment, webhooks).

## Tier 1: Business Logic

**Why:** Domain rules, workflows, and state machines. Incorrect changes break tenant outcomes and create cross-tenant inconsistencies.

- NestJS policies/services (team-scoped domain logic)
  - `apps/api/src/app/team/policies/team.policy.ts`
  - `apps/api/src/app/lead/services/lead.service.ts`
  - `apps/api/src/app/workflow/services/workflow.service.ts`
  - `apps/api/src/app/message-template/services/message-template.service.ts`
- Next.js business services used by routes/UI
  - `apps/front/src/lib/services/automation-service.ts` (imports SMS queue; `apps/front/src/lib/services/automation-service.ts:13`)
  - `apps/front/src/lib/services/sms-queue-service.ts` (singleton export; `apps/front/src/lib/services/sms-queue-service.ts:954`)
  - `apps/front/src/app/api/machine/route.ts` (state machine orchestrator)

## Tier 2: Integrations

**Why:** External APIs are cost-bearing and failure-prone; require quotas, retries, audit logs, and kill switches.

- RealEstateAPI
  - Next.js bucket enrichment: `apps/front/src/app/api/property/bucket/process/route.ts:21`
  - NestJS search runner: `apps/api/src/app/property/services/real-estate-search.service.ts:1`
- SkipTrace (RealEstateAPI)
  - `apps/api/src/app/enrichment/services/skiptrace.service.ts:1` (stores raw results; call site `apps/api/src/app/enrichment/services/skiptrace.service.ts:105`)
  - Schema anticipates cost tracking (`creditsCost`): `apps/api/src/database/schema/skiptrace-result.schema.ts:58`
- Apollo.io enrichment
  - `apps/api/src/app/enrichment/services/apollo-enrichment.service.ts:1`
  - DO Functions: `functions/packages/enrichment/enrich-lead/index.js:1`, `functions/packages/enrichment/batch-enrich/index.js:1`
- SMS/Voice/Email providers
  - Twilio: `apps/api/src/lib/twilio/twilio.service.ts:1`
  - SendGrid: `apps/api/src/lib/mail/mail.service.ts:1`
  - SignalHouse (Next.js client): `apps/front/src/lib/signalhouse/client.ts:1`
  - SignalHouse webhook: `apps/front/src/app/api/webhook/signalhouse/route.ts:1`
- CSV processing / DO Spaces
  - `functions/packages/data/csv-processor/index.js:1`
  - `functions/packages/data/export-csv/index.js:1`

## Tier 3: Platform / Wiring

**Why:** Build and deployment correctness. For DigitalOcean-only, these files must be coherent and single-source-of-truth.

- `nx.json`
- `package.json`
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`
  - **Observed:** copies exist at repo root and also under `scripts/` (duplicate).
- `Dockerfile.api`, `Dockerfile.front`
  - Docker builds copy root workspace files.
- `scripts/do-app-spec.yaml`
  - DigitalOcean App Platform spec.
- `functions/project.yml`
  - DigitalOcean serverless deployment config.
- `vercel.json`
  - Present but conflicts with “DigitalOcean only” constraint; treat as non-authoritative unless proven otherwise.

## Tier 4: Support / Runbooks

**Why:** Operating instructions, onboarding docs, scripts, and Postman collections.

- Docs: `docs/SIGNALHOUSE_ONBOARDING.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/ARCHITECTURE_FLOW.md`, `docs/BUCKET_SYSTEM.md`, `docs/MONOREPO_OVERVIEW.md`
- Ops/scripts: `scripts/*`
- Postman: `postman/*.json`

---

# 3. Tenant Context Flow

This repo currently has **two different tenant concepts** depending on layer:

- **NestJS backend:** tenant = `teamId` (DB has `teamId` columns and membership checks).
- **Next.js app DB:** tenant = `userId` (DB has `userId` columns), plus additional “teamId” usage in some routes without auth binding.

This mismatch is the primary structural risk for white-label resale.

## 3.1 NestJS backend tenant flow (team-scoped)

### Where tenant identity enters
- Resolvers accept `teamId` as an argument and then load the team:
  - Example resolver is guarded: `apps/api/src/app/lead/resolvers/lead.resolver.ts:57`.

### How it propagates
1) **Auth**: JWT is verified, then `request["user"]` is populated:
   - `apps/api/src/app/auth/guards/auth.guard.ts:44`.
2) **Team authorization**: resolver loads the team and checks membership:
   - `apps/api/src/app/lead/resolvers/lead.resolver.ts:72` calls `TeamPolicy`.
3) **DB scope**: queries include `teamId` filters and tables include `teamId`:
   - Leads schema: `apps/api/src/database/schema/leads.schema.ts:20`.

### Where it is enforced
- Membership check uses `team_members` with APPROVED status:
  - `apps/api/src/app/team/policies/team.policy.ts:17`.

### Where tenant identity may be lost
- **Property search caching is not team-scoped**:
  - Schema has no `teamId`: `apps/api/src/database/schema/property-searches.schema.ts:13`.
  - Global uniqueness by filter hash: `apps/api/src/database/schema/property-searches.schema.ts:30`.
  - Service queries by endpoint/hash only: `apps/api/src/app/property/services/real-estate-search.service.ts:66`.

## 3.2 Next.js tenant flow (user-scoped and team-scoped, inconsistent)

### User-scoped (Clerk) paths
- Some endpoints derive tenant identity from Clerk and filter by `userId`:
  - Auth extraction: `apps/front/src/app/api/leads/route.ts:21`.
  - Enforcement: `apps/front/src/app/api/leads/route.ts:42` (`eq(leads.userId, userId)`).
- Next.js DB schema includes `userId` as a required column:
  - Buckets table: `apps/front/src/lib/db/schema.ts:19` (userId appears at `apps/front/src/lib/db/schema.ts:23`).
  - Leads table: `apps/front/src/lib/db/schema.ts:57` (userId appears at `apps/front/src/lib/db/schema.ts:64`).

### Team-scoped paths (high-risk)
These endpoints accept `teamId` (or other identifiers) from input and perform DB mutations **without binding to the caller’s identity**:

- Deals:
  - Reads `teamId` from query: `apps/front/src/app/api/deals/route.ts:18`.
- Machine orchestrator:
  - Reads `teamId` from query: `apps/front/src/app/api/machine/route.ts:73`.
- Bucket processing:
  - Reads `bucketId` from body: `apps/front/src/app/api/property/bucket/process/route.ts:34`.
  - Loads bucket by id only: `apps/front/src/app/api/property/bucket/process/route.ts:54`.
- Billing usage:
  - Reads `userId` from query param: `apps/front/src/app/api/billing/usage/route.ts:49`.
- B2B enrichment:
  - Reads `leadId` from body: `apps/front/src/app/api/b2b/enrich/route.ts:14` and then updates `leads` by id.

### Webhook tenant context (SignalHouse)
- Webhook handler stores state in memory:
  - In-memory buffer: `apps/front/src/app/api/webhook/signalhouse/route.ts:37`.
  - Opt-out invokes queue service: `apps/front/src/app/api/webhook/signalhouse/route.ts:132`.
  - No tenant attribution based on phone number/team mapping is performed in this handler.

## 3.3 Summary of tenant enforcement gaps

**Strong tenant enforcement exists in NestJS GraphQL**, but **Next.js API routes contain multiple cross-tenant paths** and the system has **two competing tenant models (`teamId` vs `userId`)**. This must be resolved before white-label resale.

---

# 4. White-Label Standards Evaluation

Each standard is evaluated for the repo **as it exists today**, based on referenced files.

## Tenant isolation — PASS / PARTIAL / FAIL: **FAIL**

- **Explanation:** NestJS enforces team membership at resolver level (e.g. `apps/api/src/app/lead/resolvers/lead.resolver.ts:72` using `TeamPolicy` in `apps/api/src/app/team/policies/team.policy.ts:17`), but Next.js has multiple unauthenticated/weakly authenticated routes that mutate data using untrusted identifiers (`teamId`, `bucketId`, `userId`).
- **File references:**
  - Good isolation pattern: `apps/api/src/database/schema/leads.schema.ts:20`
  - High-risk Next routes: `apps/front/src/app/api/deals/route.ts:18`, `apps/front/src/app/api/property/bucket/process/route.ts:54`, `apps/front/src/app/api/billing/usage/route.ts:49`
  - Cross-tenant caching: `apps/api/src/database/schema/property-searches.schema.ts:13`

## Credit & cost protection — **FAIL**

- **Explanation:** There is no consistent “budget check” before cost-bearing calls. Next bucket processing calls RealEstateAPI directly (`apps/front/src/app/api/property/bucket/process/route.ts:21`). Nest schema hints at cost tracking (`creditsCost` at `apps/api/src/database/schema/skiptrace-result.schema.ts:58`) but services do not populate/enforce it (store call at `apps/api/src/app/enrichment/services/skiptrace.service.ts:105`). Next billing usage endpoint is userId-input driven (`apps/front/src/app/api/billing/usage/route.ts:49`) and is not integrated into enrichment/send pipelines.
- **File references:** `apps/front/src/app/api/property/bucket/process/route.ts:21`, `apps/api/src/database/schema/skiptrace-result.schema.ts:58`, `apps/front/src/app/api/billing/usage/route.ts:49`

## Idempotency — **PARTIAL**

- **Explanation:** Some BullMQ jobs have retries/backoff (`apps/api/src/app/enrichment/services/skiptrace.service.ts:56`) and some inserts use `.onConflictDoNothing()` in enrichment services. However, many request handlers that trigger side effects have no idempotency keys or locks (bucket processing selects “pending” leads and processes them in-request; deals can be created via repeated calls).
- **File references:** `apps/api/src/app/enrichment/services/skiptrace.service.ts:56`, `apps/front/src/app/api/property/bucket/process/route.ts:72`, `apps/front/src/app/api/deals/route.ts:1`

## Failure containment — **PARTIAL**

- **Explanation:** Nest job processing uses retries and status transitions. But Next.js request handlers perform long-running loops; a timeout/redeploy can kill progress mid-batch (bucket processing). Webhook ingestion stores state in memory which is lost on restart/scale.
- **File references:** `apps/front/src/app/api/property/bucket/process/route.ts:34`, `apps/front/src/app/api/webhook/signalhouse/route.ts:37`

## Background job isolation — **PARTIAL**

- **Explanation:** BullMQ is configured globally with a single prefix `nextier_jobs` (`apps/api/src/app/app.module.ts:56`). Many jobs include `teamId` in payloads (e.g. skiptrace job interface includes `teamId` at `apps/api/src/app/enrichment/services/skiptrace.service.ts:18`), but there is no per-tenant queue partitioning or per-tenant concurrency enforcement visible in the wiring.
- **File references:** `apps/api/src/app/app.module.ts:56`, `apps/api/src/app/enrichment/services/skiptrace.service.ts:18`

## Observability (logs, auditability) — **PARTIAL**

- **Explanation:** SkipTrace stores raw results (`apps/api/src/database/schema/skiptrace-result.schema.ts:1`), and many code paths log. However, there is no consistent correlation id across request→job→vendor call, and some critical paths keep state in memory (SignalHouse webhook).
- **File references:** `apps/api/src/database/schema/skiptrace-result.schema.ts:1`, `apps/front/src/app/api/webhook/signalhouse/route.ts:37`

## Kill switches — **FAIL**

- **Explanation:** No explicit kill switches (global or per-tenant) were identified for disabling paid external calls, disabling outbound SMS, or pausing enrichment pipelines in the referenced hot-path code.
- **File references:** None found in the audited hot paths (this is an explicit absence).

## Environment separation — **PARTIAL**

- **Explanation:** Nest uses `APP_ENV` to adjust behavior (`apps/api/src/main.ts:12`) and DO deployment specs exist (`scripts/do-app-spec.yaml`, `functions/project.yml`). However `vercel.json` exists and describes Vercel build outputs for `apps/front`, conflicting with the “DigitalOcean only” constraint.
- **File references:** `apps/api/src/main.ts:12`, `scripts/do-app-spec.yaml:1`, `vercel.json:1`

---

# 5. Failure Mode Analysis

This section simulates specific failure scenarios and ties them to concrete failure points and missing guardrails.

## Cross-tenant access

- **Failure point(s):**
  - Deals route accepts `teamId` from query: `apps/front/src/app/api/deals/route.ts:18`
  - Bucket processor loads bucket by id only: `apps/front/src/app/api/property/bucket/process/route.ts:54`
  - Billing usage reads `userId` from query: `apps/front/src/app/api/billing/usage/route.ts:49`
  - Nest property searches are not team-scoped: `apps/api/src/database/schema/property-searches.schema.ts:13`
- **Blast radius:** Data read/write across tenants + vendor spend attribution failures.
- **Missing guardrail:** Canonical tenant identity enforcement for all routes/jobs, and removal of untrusted `teamId/userId` inputs.

## Double submission

- **Failure point(s):**
  - Bucket processing selects pending leads and processes them without a per-bucket lease/lock: `apps/front/src/app/api/property/bucket/process/route.ts:72`
  - Deal creation is request-driven and can be repeated: `apps/front/src/app/api/deals/route.ts:1`
- **Blast radius:** Duplicate vendor calls, duplicate outreach, inconsistent CRM state.
- **Missing guardrail:** Idempotency keys + locking (bucket-level status lease, message-send idempotency).

## External API outage

- **Failure point(s):**
  - RealEstateAPI calls inside Next.js bucket processing: `apps/front/src/app/api/property/bucket/process/route.ts:21`
  - Apollo enrichment (axios) in Nest: `apps/api/src/app/enrichment/services/apollo-enrichment.service.ts:1`
  - DO Functions enrichment calls: `functions/packages/enrichment/batch-enrich/index.js:1`
- **Blast radius:** Failed enrichments, job retries, possible runaway spend if retries are uncontrolled.
- **Missing guardrail:** Provider-specific circuit breakers + tenant-level pause switches + consistent retry/backoff policy.

## CSV malformed input

- **Failure point(s):**
  - CSV parsing assumes headers and can throw: `functions/packages/data/csv-processor/index.js:94`
- **Blast radius:** Function invocation failure; potential partial outputs depending on crash timing.
- **Missing guardrail:** CSV schema validation and row-level error reporting.

## Credit exhaustion mid-job

- **Failure point(s):**
  - No budget enforcement before RealEstateAPI calls in bucket processing: `apps/front/src/app/api/property/bucket/process/route.ts:21`
  - SkipTrace schema supports cost tracking (`creditsCost`) but service does not populate it: `apps/api/src/database/schema/skiptrace-result.schema.ts:58`, `apps/api/src/app/enrichment/services/skiptrace.service.ts:105`
- **Blast radius:** Unexpected vendor spend; inability to reconcile billing.
- **Missing guardrail:** Mandatory pre-flight budget checks + mid-stream stop-work state and accurate cost recording.

## Job killed mid-execution

- **Failure point(s):**
  - Long-running synchronous bucket processing in Next.js request handler: `apps/front/src/app/api/property/bucket/process/route.ts:34`
  - SignalHouse webhook keeps in-memory message list: `apps/front/src/app/api/webhook/signalhouse/route.ts:37`
  - Nest RealEstateSearchService persists blocks to local disk under `process.cwd()` (ephemeral on DO): `apps/api/src/app/property/services/real-estate-search.service.ts:1`
- **Blast radius:** Partial state, lost messages, repeated work.
- **Missing guardrail:** Move long work to BullMQ jobs; use DO Spaces for durable storage; implement leases/checkpoints.

---

# 6. REQUIRED REMEDIATION TASKS (ORDERED)

These are ordered to minimize risk and maximize white-label readiness. “Files involved” lists the minimum set Claude must touch.

## 1) Canonicalize tenant identity across the stack

- **Description:** Decide and document the canonical tenant identifier and boundary. Today the repo uses both `teamId` (Nest) and `userId` (Next DB). For white-label, pick one and enforce it consistently (recommendation: `teamId` as tenant).
- **Files involved:** `apps/api/src/database/schema/teams.schema.ts`, `apps/api/src/app/team/policies/team.policy.ts`, `apps/front/src/lib/db/schema.ts`
- **Why it matters:** Without a single tenant model, authorization can’t be proven correct.
- **Risk if skipped:** Persistent tenant confusion + inevitable cross-tenant leaks.
- **Classification:** **BLOCKER**

## 2) Require auth + tenant authorization for ALL Next.js API routes that read/write data

- **Description:** Every Next.js route must derive tenant from authenticated identity and validate ownership of any referenced IDs (`bucketId`, `leadId`, etc.) before DB access.
- **Files involved (minimum high-risk set):**
  - `apps/front/src/app/api/deals/route.ts`
  - `apps/front/src/app/api/machine/route.ts`
  - `apps/front/src/app/api/property/bucket/process/route.ts`
  - `apps/front/src/app/api/billing/usage/route.ts`
  - `apps/front/src/app/api/b2b/enrich/route.ts`
- **Why it matters:** These are direct cross-tenant and cost escalation vectors.
- **Risk if skipped:** Unauthorized DB mutations + paid API abuse.
- **Classification:** **BLOCKER**

## 3) Make SignalHouse webhook durable and tenant-attributed

- **Description:** Remove in-memory storage; persist inbound events to DB; map inbound phone numbers to the correct tenant/team.
- **Files involved:** `apps/front/src/app/api/webhook/signalhouse/route.ts`, `apps/front/src/lib/db/schema.ts`, `apps/front/src/lib/db.ts`
- **Why it matters:** STOP/opt-out must be reliable for compliance; inbound messages are core CRM data.
- **Risk if skipped:** Lost STOP requests, compliance risk, data loss on restart.
- **Classification:** **BLOCKER**

## 4) Verify webhook authenticity (SignalHouse + Twilio) and rate-limit ingestion

- **Description:** Validate webhook signatures or a shared secret; implement rate limiting for inbound endpoints.
- **Files involved:** `apps/front/src/app/api/webhook/signalhouse/route.ts`, `apps/front/src/app/api/webhook/sms/inbound/route.ts`, `apps/front/src/app/api/webhook/voice/inbound/route.ts`, `functions/packages/webhooks/sms-inbound/index.js`
- **Why it matters:** Prevent spoofing and poisoning of tenant data/state.
- **Risk if skipped:** Attackers can generate fake inbound events and trigger opt-outs or automation.
- **Classification:** **BLOCKER**

## 5) Implement tenant-level cost accounting and enforcement for paid APIs

- **Description:** Introduce a single budget/usage enforcement mechanism and require it before paid calls (RealEstateAPI, Apollo, SMS, skip trace, email). Populate existing cost fields where present (e.g. `creditsCost`).
- **Files involved:** `apps/front/src/app/api/property/bucket/process/route.ts`, `apps/api/src/app/enrichment/services/skiptrace.service.ts`, `apps/api/src/database/schema/skiptrace-result.schema.ts`, `apps/api/src/app/enrichment/services/apollo-enrichment.service.ts`, `apps/front/src/app/api/billing/usage/route.ts`
- **Why it matters:** White-label resale requires preventing runaway spend and enabling clean billing.
- **Risk if skipped:** Unbounded vendor spend and margin loss.
- **Classification:** **BLOCKER**

## 6) Fix NestJS property search cross-tenant caching

- **Description:** Make property searches tenant-scoped (or explicitly public/shared with a written policy). Today schema lacks `teamId` and uses global uniqueness by filter hash.
- **Files involved:** `apps/api/src/database/schema/property-searches.schema.ts`, `apps/api/src/app/property/services/real-estate-search.service.ts`
- **Why it matters:** Searches/blocks may leak proprietary lead lists and strategies.
- **Risk if skipped:** Cross-tenant leakage.
- **Classification:** **BLOCKER**

## 7) Move long-running Next.js “processing loops” into background jobs

- **Description:** Convert long-running request handlers into BullMQ jobs with durable checkpoints and retry strategy.
- **Files involved:** `apps/front/src/app/api/property/bucket/process/route.ts`, Nest BullMQ wiring `apps/api/src/app/app.module.ts`
- **Why it matters:** Prevents timeouts, partial execution, and repeated work.
- **Risk if skipped:** Instability under load and DO deployment restarts.
- **Classification:** **IMPORTANT**

## 8) Add idempotency keys + locks for side-effect endpoints

- **Description:** Add idempotency keys and per-entity leases (bucket-level lock, message-send idempotency, job uniqueness).
- **Files involved:** Same endpoints as tasks 2/7 plus relevant job enqueue sites.
- **Why it matters:** Stops duplicate sends and double charges.
- **Risk if skipped:** Duplicate outreach and spend.
- **Classification:** **IMPORTANT**

## 9) Resolve identity boundary between Clerk (Next) and JWT (Nest)

- **Description:** Define a single identity boundary:
  - either Nest is internal-only (service token from Next), or
  - Nest validates end-user identity and maps it to `teamId`.
- **Files involved:** `apps/api/src/app/auth/guards/auth.guard.ts`, `apps/api/src/app/auth/services/auth.service.ts`, `apps/front/src/app/api/leads/bulk-create/route.ts`
- **Why it matters:** Prevents “two auth systems” drift and insecure bypasses.
- **Risk if skipped:** Inconsistent authorization and hard-to-fix security holes.
- **Classification:** **IMPORTANT**

## 10) Add durable audit logs for all paid external calls and tenant actions

- **Description:** Ensure every paid call is logged with tenant/team, request id, provider, response, and cost.
- **Files involved:** `apps/api/src/database/schema/skiptrace-result.schema.ts`, plus the other integration call sites in Tier 2.
- **Why it matters:** Required for billing disputes, abuse detection, and compliance.
- **Risk if skipped:** No spend attribution; painful incident response.
- **Classification:** **IMPORTANT**

## 11) DigitalOcean-only deployment hygiene

- **Description:** Make DO specs and Dockerfiles the canonical deployment path. Treat `vercel.json` as non-authoritative unless proven in use.
- **Files involved:** `scripts/do-app-spec.yaml`, `Dockerfile.api`, `Dockerfile.front`, `functions/project.yml`, `vercel.json`
- **Why it matters:** White-label resale needs reproducible DO deployments.
- **Risk if skipped:** Production drift across environments.
- **Classification:** **OPTIONAL (v2)** (unless Vercel is actually used in production today)

---

# 7. Claude Execution Instructions

## Instructions for Claude Code

Claude must execute tasks in the order below and **stop immediately** on any listed stopping condition.

### What NOT to change
- Do not refactor unrelated code.
- Do not change vendor endpoints/auth styles unless required for security or cost enforcement.
- Do not “merge” Next DB and Nest DB models in one pass.
- Do not introduce new infra outside DigitalOcean.

### Order of execution (with validations)

1) **Baseline build sanity**
   - Run: `pnpm install`
   - Run: `pnpm exec nx show projects`
   - Run: `pnpm exec nx run-many -t build --projects=@nextier/common,@nextier/dto,api,front,fdaily-pro --outputStyle=stream`
   - **Stop if:** Nx projects are missing or builds fail; fix Tier 3 wiring first.

2) **Lock down the known high-risk Next.js API routes (Task 2)**
   - Apply auth + tenant authorization to:
     - `apps/front/src/app/api/deals/route.ts`
     - `apps/front/src/app/api/machine/route.ts`
     - `apps/front/src/app/api/property/bucket/process/route.ts`
     - `apps/front/src/app/api/billing/usage/route.ts`
     - `apps/front/src/app/api/b2b/enrich/route.ts`
   - Validate after each file: `pnpm exec nx run front:build`
   - **Stop if:** A route cannot be safely bound to tenant identity; return `403` until mapping exists (document this explicitly).

3) **Webhook durability + verification (Tasks 3–4)**
   - Update `apps/front/src/app/api/webhook/signalhouse/route.ts` to remove in-memory storage and persist events.
   - Add webhook verification and rate limiting.
   - Validate: `pnpm exec nx run front:build`
   - **Stop if:** Verification would break production and no safe gating strategy exists.

4) **Tenant cost enforcement (Task 5)**
   - Implement and integrate budget checks into RealEstateAPI and other paid calls.
   - Populate cost/audit fields where schemas already anticipate them.
   - Validate: `pnpm exec nx run api:build` and `pnpm exec nx run front:build`
   - **Stop if:** You cannot enforce without breaking core flows; ship audit-only + kill switch first.

5) **Nest property search tenant scoping (Task 6)**
   - Make property searches team-scoped or explicitly declare them shared with a written policy.
   - Validate: `pnpm exec nx run api:build`
   - **Stop if:** Required DB migrations are unclear; produce a migration plan instead of guessing.

6) **Docs reconciliation**
   - Update: `docs/ARCHITECTURE_OVERVIEW.md`, `docs/ARCHITECTURE_FLOW.md`, `docs/SIGNALHOUSE_ONBOARDING.md`
   - Validate: targeted `rg` searches for outdated statements.
