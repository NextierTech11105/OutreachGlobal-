# Social XPress Engine — Execution Handoff Contract

_A product by Nextier (not the Nextier app)_

## 1. Purpose
This contract defines how Social XPress Engine hands off execution-ready data to Nextier platforms and Outreach Global without coupling. It guarantees:
- Social XPress remains a market-acquisition product.
- Nextier remains an execution platform.
- No shared code, databases, or logic between systems.
- Only versioned contracts connect the systems.

## 2. Integration Doctrine
Social XPress connects to execution platforms through:
- File handoff
- API handoff
- Queue/event handoff

Never through:
- Shared databases
- Shared state machines
- Embedded code
- Direct service calls

## 3. Handoff Object: Lead Card Batch
All execution handoff happens through Lead Card Batches.

**Batch Envelope**
```json
{
  "batch_id": "sxp_2026_01_11_001",
  "schema_version": "v1",
  "created_at": "2026-01-11T18:22:00Z",
  "source": "social-xpress-engine",
  "target": "nextier-execution",
  "records": []
}
```

## 4. Lead Card Schema (v1)
```json
{
  "lead_id": "uuid",
  "source_platform": "tiktok | threads | x",
  "username": "string",
  "display_name": "string",

  "audience_pool": "wholesalers | brokers | solar | consultants",
  "persona": "operator | owner | marketer | investor",
  "tribe": "dealmakers | builders | growth-operators",

  "execution_label": "USER | PARTNER | AFFILIATE | FEEDBACK",
  "confidence_score": 0.0,

  "enrichment_status": "NONE | REQUESTED | ENRICHED | FAILED",
  "contactability_score": 0.0,

  "created_at": "timestamp"
}
```

## 5. Enrichment Status Model
| Status     | Meaning                                   |
|------------|-------------------------------------------|
| NONE       | Lead has not passed enrichment gate       |
| REQUESTED  | Enrichment approved, pending execution    |
| ENRICHED   | Contact + business data attached          |
| FAILED     | Enrichment attempted but failed           |

**Rule:** Execution platforms must not enrich leads themselves. They only consume enrichment results from Social XPress.

## 6. Transport Options
**Option A — File Handoff (default MVP)**
- Location: DigitalOcean Spaces
- Path: `spaces/exports/lead-batches/{batch_id}.json`
- Consumption: polled by execution platforms

**Option B — API Handoff**
- Endpoint: `POST /handoff/lead-batch`
- Response: `{ "status": "accepted", "batch_id": "..." }`

**Option C — Queue/Event Handoff**
- Topic: `social-xpress.lead-batch.ready`
- Payload: batch envelope
- Consumers: Nextier ingestion workers

## 7. Versioning Rules
- Every batch includes `schema_version`.
- Backward compatibility is required for one major version.
- Breaking changes require a new version and explicit acceptance by execution platforms.
- Old versions sunset by policy, not by accident.

## 8. Audit Requirements
Every handoff must log: `batch_id`, `schema_version`, `target system`, `timestamp`, `checksum`, `success/failure`.
- Storage: `audit_log`
- Purpose: compliance, cost control, forensic analysis

## 9. Boundary Enforcement
Social XPress must never: trigger campaigns; schedule calls; assign reps; mutate pipelines; store deal data.

Execution platforms must never: enrich leads; tag tribes; modify personas; rewrite lead cards.

Each system owns its layer.

## 10. Final Contract Statement
Social XPress creates execution-ready assets. Nextier executes. The contract is the boundary.
