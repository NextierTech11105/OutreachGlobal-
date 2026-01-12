# Social XPress Engine — MVP Plan
## A product by Nextier (not the Nextier app)

---

## Purpose
This plan defines the **minimum complete system** required to move Social XPress Engine from concept to production-ready product while preserving:

- product boundaries
- auditability
- clean handoff to execution platforms

The sequence follows the canonical flow:

ingest → normalize → tag/tribe → enrich-on-demand → audit → handoff

---

## Guiding principles

1. Audience before execution
2. Structure before enrichment
3. Enrichment before outreach
4. Execution only after readiness
5. No automation of trust
6. Contracts over coupling

---

# Phase 1 — Ingest

### Goal
Bring social audience data into the system safely and consistently.

### Deliverables
- Import pipeline for:
  - TikTok
  - Threads
  - X
- Validation layer:
  - format checks
  - deduplication
- Persistence:
  - `raw_social_profiles` table

### Exit criteria
- Can ingest ≥10k profiles
- Zero contact data stored
- All records auditable by source + timestamp

---

# Phase 2 — Normalize

### Goal
Convert raw social profiles into **structured lead cards**.

### Deliverables
- Lead card generator
- Audience-pool assignment
- Base confidence scoring
- Persistence:
  - `lead_cards` table

### Exit criteria
- 100% of ingested profiles become lead cards
- No enrichment fields present
- Clear lineage: raw profile → lead card

---

# Phase 3 — Tag / Tribe

### Goal
Add **intelligence, not contactability**.

### Deliverables
- Bio parsing engine
- Auto-classification:
  - industry
  - persona
  - tribe
- Execution labels:
  - USER
  - PARTNER
  - AFFILIATE
  - FEEDBACK

### Exit criteria
- ≥80% of lead cards tagged with:
  - persona
  - tribe
- Labels applied consistently
- No enrichment triggered yet

---

# Phase 4 — Enrich-on-Demand

### Goal
Create contactability **only when justified**.

### Deliverables
- Enrichment gate:
  - label-based approval
- Batch orchestration:
  - max 250 records per batch
- Adapters:
  - Skip trace provider
  - Apollo.io
- Persistence:
  - `contacts`
  - `businesses`

### Exit criteria
- Enrichment only occurs after gate approval
- 100% of enrichment actions logged
- Contact data never stored in social tables

---

# Phase 5 — Audit

### Goal
Make every sensitive action **traceable**.

### Deliverables
- `audit_log` table
- Events:
  - enrichment_requested
  - enrichment_started
  - enrichment_completed
  - enrichment_failed
  - handoff_emitted
- Cost + volume metrics

### Exit criteria
- Every enrichment action has:
  - timestamp
  - actor
  - outcome
- Can produce compliance trail on demand

---

# Phase 6 — Execution Handoff

### Goal
Deliver execution-ready assets **without coupling**.

### Deliverables
- Lead card batch exporter
- Schema v1 enforcement
- Transport support:
  - File (default MVP)
  - API
  - Queue/event
- Versioning rules implemented

### Exit criteria
- Execution platforms can:
  - ingest batches
  - trust schema
  - operate without shared code or DB
- Handoff success/failure logged

---

# MVP Completion Definition

The MVP is complete when:

- Social XPress Engine can ingest and structure **10k+ audience profiles**
- Leads are:
  - grouped
  - tagged
  - tribe-classified
  - labeled
- Enrichment happens:
  - selectively
  - in audited batches
- Execution platforms receive:
  - clean
  - versioned
  - execution-ready lead batches
- No campaign, messaging, or deal logic exists in this repo

---

## Final statement

> **The MVP is not a feature set.
> It is a boundary-respecting system that turns audience into infrastructure — safely.**
