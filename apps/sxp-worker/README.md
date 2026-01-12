# SXP Worker

Purpose: background workers for Social Xpress (queues/cron) handling enrichment jobs, retries, and handoff fan-out.

Responsibilities
- Consume queued lead/enrichment tasks and orchestrate external lookups.
- Enforce the enrichment gate before emitting handoff payloads.
- Run scheduled jobs (refresh, retry dead-letter, reconcile handoffs).

Next steps
- Wire into Nx (project config) and add worker runtime entrypoint.
- Point Docker build context here (see deploy/social-xpress Dockerfiles).
- Add queue/broker config (e.g., Redis/BullMQ) and env samples per environment.
