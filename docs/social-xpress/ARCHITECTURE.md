# Social XPress Engine — High-Level Architecture

_A standalone Nextier product for audience-to-infrastructure. Not the Nextier app._

## Purpose
- Convert social audience pools into structured, enriched, execution-ready lead assets.
- Feed execution platforms **only via contracts** (file/API/queue). No shared code, data, or state.
- Preserve IP boundaries while enabling white-labeling and clean compliance.

## Non-Negotiable Principles
- Audience before execution; structure before enrichment; enrichment before outreach.
- No outbound messaging logic, campaign logic, call queues, or deal workflows in this product.
- Separate data tiers (social → contact → execution). Tiers never collapse.
- Adapters only; no embedded vendor logic. Versioned contracts for every integration.
- All enrichment actions are auditable; credentials never live in code.

## Service Topology (DigitalOcean-ready)
- `social-xpress-api` (ingestion, lead cards, intelligence, handoff)
- `social-xpress-worker` (enrichment orchestration, adapters, batching)
- Managed Postgres `social_xpress_db` (VPC-only)
- DO Spaces (optional): `imports/`, `exports/`, `audit-logs/`
- Networking: API is public; worker is private; DB and Spaces reachable only via VPC; no peering to Nextier app DBs.

## Domain Map
- **Ingestion**: Pull/import public social profiles (TikTok, Threads, X). Handles dedupe, rate limits, and source attribution.
- **Profile Normalization**: Normalize raw profiles into `raw_social_profiles` (Tier 1) with platform-agnostic shape and quality flags.
- **Lead Card Factory**: Build `lead_cards` from normalized profiles; attach tribe/persona labels; maintain readiness state.
- **Persona & Tribe Intelligence**: Auto-tagging and grouping; rule + heuristic layer (no outbound actions).
- **Enrichment Orchestrator**: Gatekeeper for enrichment. Decides when to call adapters; maintains budgets, intent checks, and cooldowns.
- **Adapters Layer**: Skip-trace, Apollo/business enrichment, other data providers. Each adapter is versioned, isolated, and auditable.
- **Audit & Telemetry**: Immutable enrichment and handoff audit logs; structured event stream for observability.
- **Execution Handoff**: Packages execution-ready assets (file/API/queue). Owns schema versioning and backward compatibility.

## Data Tiers & Stores
- **Tier 1 — Social Data (Postgres)**: `raw_social_profiles` (usernames, bios, platform signals, engagement context). PII-free by design.
- **Tier 2 — Contact Data (Postgres)**: `contacts`, `businesses` (email/phone/business intel). Created only after enrichment gate passes. Separated schemas or tables from Tier 1.
- **Tier 3 — Execution Data (Postgres)**: `lead_cards`, `labels`, `routing_hints`, `readiness_state`. References Tier 2 by ID, not by denormalized PII.
- **Object Storage (Spaces)**: Bulk imports/exports, optional audit log replication. Server-side encryption required.
- **Retention**: Tier 1 can be longer-lived; Tier 2/3 follow stricter retention & access controls; enrichment payloads minimized and redacted on store.

## Data Flow (happy path)
1) Ingest profile → store in Tier 1 with source + hash for dedupe.
2) Normalize → validate quality → mark ingest intent.
3) Lead Card Factory builds `lead_card` skeleton (no PII yet), links to Tier 1 profile IDs.
4) Persona/tribe tagging populates labels and readiness hints.
5) Enrichment Orchestrator evaluates intent/budget → triggers adapters via worker jobs.
6) Adapters return enrichment; only allowed fields persist into Tier 2; audit entries written.
7) Readiness updated; execution handoff packages lead cards + enrichment metadata for downstream (file/API/queue).

## Adapters Layer (contract-first)
- All adapters implement: `request schema` → `provider call` → `normalized response schema` → `audit entry` → `write-through with redaction`.
- Providers (initial): Skip trace, Apollo/business intelligence. Future providers add via new versions; no breaking changes without version bump.
- Error handling: classify (retryable/non-retryable), rate-limit aware, budget-aware, with per-provider circuit breakers.

## Audit, Logging, Observability
- **Audit Log**: Every enrichment attempt/outcome, handoff event, and schema version used. Immutable append-only table; includes who/what/why.
- **Event Stream**: Structured events for ingestion, normalization, enrichment, readiness changes, and handoffs (for dashboards/alerts).
- **PII Handling**: Never log raw PII; redact sensitive fields; store adapter payload hashes when needed for traceability.
- **Access Control**: Service-role separation (api vs worker). Principle of least privilege for DB and Spaces. No shared credentials with Nextier app.

## Boundaries vs Nextier Execution Platforms
- No shared databases, schemas, migrations, or ORM models.
- No shared business logic or state machines. This product ends at the handoff contract.
- Integrations are **pull-only by contract** (file/API/queue) with versioned schemas and backward compatibility.
- Execution platforms consume artifacts; they never depend on internal tables or services here.

## Transport & Interfaces (internal)
- API: REST/GraphQL acceptable internally; external-facing contract deferred to handoff doc.
- Jobs/Queues: Worker consumes enrichment jobs; queue is private/VPC-only.
- Feature flags: Centralized config (env/feature flag service) to gate adapters and costs.

## Security & Compliance
- Secrets via DO managed secrets; never in repo.
- DB is VPC-only; API is TLS-only; worker has no public ingress.
- Separate IAM for Spaces buckets; path-based segregation (`imports/`, `exports/`, `audit-logs/`).
- NDA + IP protection: repository remains proprietary; no shared code artifacts with execution stacks.

## Environment Separation
- `dev.social-xpress.nextier.io` — fast iteration, seeded data.
- `staging.social-xpress.nextier.io` — contract validation and handoff rehearsals.
- `api.social-xpress.nextier.io` — production; strict audit and budget controls.
- Each environment has its own DB, secrets, audit sink, and Spaces paths. No cross-env data flows.

## Extensibility & Versioning
- Schemas (lead cards, enrichment payloads, handoff artifacts) are versioned; breaking changes require new versions, not mutations.
- Adapters are pluggable; add via new provider modules without touching core domain logic.
- Handoff transports (file/API/queue) are interchangeable behind a contract interface.

## Deployment Notes (DigitalOcean)
- Prefer DO App Platform for API + worker; fall back to Droplets + Docker only for custom runtimes.
- Use DO Managed Postgres with VPC; enforce SSL.
- Spaces for bulk import/export and optional audit replication; enable object lifecycle policies.
- Health checks: API liveness/readiness; worker heartbeat; queue depth alarms; adapter error-rate alarms.

## What Stays Out
- Messaging, campaigns, call queues, deal pipelines, CRM workflows, marketing automation, nurture logic. Those live in execution platforms, not here.

---
This document is the authoritative north star for system structure. Contracts, guardrails, and milestones build on this architecture and must not cross its boundaries.
