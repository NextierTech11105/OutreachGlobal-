# Social XPress Engine — Mental Map
_A quick way to think about the system._

## Identity
- Product, not feature. Separate from Nextier execution stacks.
- Audience-to-infrastructure factory; stops at handoff.

## Layers in your head
1) Attention: public social signals only (PII-free).
2) Structure: lead cards + labels (persona, tribe, audience_pool, execution_label).
3) Enrichment: gated, budgeted, auditable contact/business data.
4) Handoff: versioned batches to execution platforms (file/API/queue).

## Boundaries
- Social XPress never: sends messages, runs campaigns, assigns reps, manages deals.
- Execution platforms never: enrich, relabel, or rewrite lead cards.
- No shared DBs, code, or state machines across the boundary.

## Data tiers (do not collapse)
- Tier 1 Social: usernames, bios, platform context (PII-free).
- Tier 2 Contact: email/phone/business intel (after gate).
- Tier 3 Execution: labels, readiness, routing hints.

## Control points
- Enrichment gate: intent + budget + batch cap (≤250).
- Adapters: swap-in/out, redacted logs, retries with breakers.
- Audit: every enrichment and handoff; no raw PII.

## Deployment mental model
- Two services: API (public), worker (private).
- One DB per env; Spaces for imports/exports; queue for jobs.
- Envs: dev (cheap), staging (validation), prod (scaled, autoscale optional).

## How to use this map
- If a change touches execution logic, it is out-of-bounds.
- If a change collapses tiers, it is out-of-bounds.
- If a change bypasses the contract, it is out-of-bounds.
