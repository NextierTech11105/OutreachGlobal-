# Social XPress Engine — First Milestone Issues

These are GitHub-ready issues aligned to the MVP plan (ingest → normalize → tag/tribe → enrich-on-demand → audit → handoff). Copy/paste into GitHub; each includes acceptance criteria.

## 1) Stand up domain skeletons
**Goal:** Create repo scaffolding for API + worker + shared packages.
- AC: Base Nest/Fastify (API) and worker app created; lint/test scripts exist; CI placeholder ready; no outbound messaging code present.

## 2) Data model scaffolding (Tier 1/2/3)
**Goal:** Create Postgres schemas for raw_social_profiles (Tier 1), lead_cards (Tier 3), contacts/businesses (Tier 2), audit_log.
- AC: Drizzle/ORM migrations generated; tiers separated; no contact fields in Tier 1; audit_log table present; schema version noted.

## 3) Ingestion pipeline v0 (TikTok/Threads/X)
**Goal:** Import public profiles into raw_social_profiles with dedupe + validation.
- AC: CLI or job ingests ≥100 fixture profiles per source; format/quality validation; dedupe by platform+username hash; metrics emitted.

## 4) Lead Card Factory v0
**Goal:** Normalize profiles into lead_cards without enrichment.
- AC: 100% ingested profiles yield lead_cards; readiness state set to "STRUCTURED"; lineage (raw_profile_id) stored; base confidence score populated.

## 5) Persona/Tribe tagging v0
**Goal:** Auto-classify persona, tribe, audience_pool, execution_label.
- AC: Rule/heuristic engine applies labels; ≥80% coverage on fixtures; labels persisted; no enrichment triggered.

## 6) Enrichment Gate + Orchestrator v0
**Goal:** Enrichment only when labels allow; batches capped at 250.
- AC: Gate enforces allowlist labels; budget knob present; batches queued; adapters mocked; status transitions logged (NONE→REQUESTED→ENRICHED/FAILED).

## 7) Adapters (Skip trace + Apollo) v0
**Goal:** Adapter contracts with redaction and audit.
- AC: Request/response schemas defined; sandbox/mock providers wired; PII redacted in logs; retry + circuit-breaker behavior stubbed.

## 8) Audit spine
**Goal:** Immutable audit for enrichment + handoff.
- AC: audit_log writes for enrichment_requested|started|completed|failed|handoff_emitted; includes batch_id, schema_version, actor, outcome; no raw PII stored.

## 9) Execution handoff exporter v1
**Goal:** Emit lead-card batches using contract v1 (file first).
- AC: Exporter writes JSON batch to Spaces path exports/lead-batches/{batch_id}.json; schema_version=v1; checksum logged; success/failure audited.

## 10) DO App Platform deploy (dev env)
**Goal:** Deploy API + worker + Managed PG + Spaces using do-app-spec.
- AC: Spec applied in dev; secrets injected; API health check passes; worker starts and drains a sample queue; no public ingress to worker/DB.
