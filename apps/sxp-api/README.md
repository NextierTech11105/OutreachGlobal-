# SXP API

Purpose: Social Xpress API (NestJS/GraphQL) for lead cards, persona & tribe intelligence, enrichment gate, and contact/business enrichment.

Responsibilities
- Ingest lead batches (file/API/queue) and validate against contract versions.
- Run enrichment and approvals; enforce the enrichment gate before handoff.
- Expose handoff endpoints and events for downstream execution platforms.

Next steps
- Wire into Nx (project config) and add initial app skeleton.
- Point Docker build context here (see deploy/social-xpress Dockerfiles).
- Add env samples per environment (dev/stage/prod) and DB migrations.
