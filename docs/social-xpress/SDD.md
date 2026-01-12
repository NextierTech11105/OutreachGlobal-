# Social XPress Engine — System Design Doc (SDD)
_A product by Nextier (not the Nextier app)_

## Overview
Social XPress Engine converts social audience pools into execution-ready lead assets. It runs as an independent product with API + worker services, Managed Postgres, and Spaces, integrating with execution platforms only via versioned contracts (file/API/queue).

## Architecture summary
- Services: `sxp-api` (ingest, lead cards, handoff), `sxp-worker` (enrichment orchestration, adapters).
- Data: Postgres (Tier 1 social, Tier 2 contact, Tier 3 execution), Spaces for imports/exports, queue for jobs.
- Contracts: Lead Card Batch v1 (see EXECUTION_HANDOFF_CONTRACT.md). Backward compatible for one major version.
- Deployment: DigitalOcean App Platform (dev/stage/prod specs in deploy/social-xpress/).

## Components
- Ingestion: pulls/imports public profiles (TikTok, Threads, X), dedupes, quality checks, stores Tier 1 `raw_social_profiles`.
- Lead Card Factory: builds `lead_cards`, links to raw profiles, sets readiness and base confidence.
- Labeling: persona, tribe, audience_pool, execution_label via rules/heuristics (no outbound actions).
- Enrichment Orchestrator: gate for intent/budget, batches ≤250, queues jobs for adapters.
- Adapters: skip trace, Apollo; contract-first; redacted logging; retry/circuit breakers.
- Audit: immutable `audit_log` with enrichment and handoff events (batch_id, schema_version, actor, outcome).
- Handoff Exporter: packages Lead Card Batches and delivers via file/API/queue; logs checksum and success/failure.

## Data model (high level)
- Tier 1 (social): `raw_social_profiles` (platform, username, bio, engagement signals, source, hashes). PII-free.
- Tier 2 (contact): `contacts`, `businesses` (created only post-gate). Stored separately from Tier 1.
- Tier 3 (execution): `lead_cards` (references Tier 1/2 IDs), labels, routing/readiness, scores.
- Audit: `audit_log` (event_type, actor/service, batch_id, schema_version, outcome, timestamp, checksum). No raw PII.

## Key flows
1) Ingest → validate → dedupe → Tier 1 store.
2) Normalize → create lead_card → set readiness/score → apply labels.
3) Gate checks labels/budget → queue enrichment batch (≤250) → adapters fetch/normalize → store Tier 2 → update status → audit.
4) Exporter builds Lead Card Batch v1 → transports (file default; API/queue optional) → audit handoff event.

## Non-functional requirements
- Security: secrets in DO managed secrets; DB VPC-only; worker private; API TLS-only; Spaces IAM scoped.
- Compliance: no PII in logs; audit for all enrichment/handoff actions; data tiers separation enforced.
- Reliability: retries with backoff on adapters; circuit breakers per provider; checksum on exports.
- Scalability: horizontal instances per env spec; batch size cap; queue decouples enrichment load.
- Observability: structured events for ingest, normalize, enrich states, handoff; error budgets per adapter.

## Deployment and environments
- Specs: dev/stage/prod in deploy/social-xpress/ (size, budgets, retention differ; prod allows autoscale).
- Containers: Dockerfile.sxp-api, Dockerfile.sxp-worker; wire `--filter` to actual service packages when created.
- Secrets: DATABASE_URL, DO Spaces keys, broker URL, provider API keys, APP_BASE_URL, HANDOFF defaults.

## Boundary enforcement
- No shared databases or code with execution platforms.
- Execution platforms consume batches; they do not enrich, label, or mutate lead cards.
- Product forbids campaigns, messaging, call queues, pipelines, or CRM logic.

## Open items
- Choose queue/broker implementation for worker (e.g., Redis/BullMQ vs managed MQ).
- Define SLOs for handoff latency per transport.
- Finalize retention and rotation for Spaces exports and audit logs per environment.
