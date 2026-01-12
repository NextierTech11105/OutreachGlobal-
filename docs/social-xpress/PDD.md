# Social XPress Engine — Product Design Doc (PDD)
_A product by Nextier (not the Nextier app)_

## Purpose
Convert social audience pools into structured, enriched, execution-ready lead assets that feed Nextier execution platforms by contract (file/API/queue), never by shared code or DB.

## Goals
- Build markets before campaigns: capture and structure audience attention.
- Produce clean, labeled lead cards with persona/tribe intelligence.
- Enrich on-demand with auditability and cost control.
- Deliver versioned, execution-ready batches without coupling.
- Preserve IP boundaries for white-labeling and licensing.

## Non-goals
- Running campaigns, messaging, call queues, deal pipelines, CRM workflows, or sales automation.
- Sharing databases, code, or state machines with execution platforms.

## Users and jobs-to-be-done
- Market ops / GTM leads: prove a new market by structuring audience assets before launch.
- Data ops: ingest, normalize, and enrich selectively with audit trails and budgets.
- Integrations/Platform teams: consume trusted, versioned lead batches without touching acquisition internals.

## Core flows
1) Ingest public social profiles (TikTok, Threads, X) → dedupe → Tier 1 store.
2) Normalize into lead cards → persona/tribe labels → readiness state.
3) Enrich on-demand via adapters (skip trace, Apollo) behind an approval/budget gate.
4) Audit every enrichment and handoff action.
5) Handoff lead-card batches via file/API/queue using versioned schemas.

## Scope (MVP)
- In-scope: ingest, normalize, labeling (persona/tribe/audience_pool/execution_label), enrichment gate, adapters, audit log, handoff exporter.
- Out-of-scope: any outbound messaging, campaign logic, call routing, CRM/deal management, sales analytics.

## Success metrics (MVP)
- Ingest ≥10k profiles with zero contact data in Tier 1.
- ≥80% lead cards tagged with persona + tribe.
- 100% enrichment actions audited; enrichment only post-gate.
- Handoff batches ingested by execution platforms with zero schema errors over rolling 30 days.
- No campaign/messaging/deal features present in repo.

## Constraints and guardrails
- Data tiers never collapse (social vs contact vs execution).
- Adapters only; credentials never in code; VPC-only DB; worker has no public ingress.
- Backward-compatible schemas; breaking changes require new versions.
- Execution platforms must not enrich, relabel, or mutate lead cards.

## Risks and mitigations
- Scope creep into execution: mitigated by contribution guardrails and contract boundaries.
- Enrichment cost overrun: mitigated by budget gate and batch limits (≤250).
- Compliance/PII leakage: mitigated by tier separation, redaction in logs, immutable audit.

## Dependencies
- DigitalOcean App Platform (API + worker), Managed Postgres, Spaces.
- Skip trace provider, Apollo.io (via adapters).
- Queue/broker for worker jobs (URL injected by env).

## Open questions
- Which broker for queues (e.g., Redis/BullMQ vs DO MQ)?
- SLA/latency targets per handoff mode (file vs API vs queue) for production.
- Retention policies per tier beyond MVP (current: Tier 1 longer, Tier 2/3 stricter).
