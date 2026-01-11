-- Draft migration (not executed). Review before promoting to an official migration.
-- Purpose: add durable batch job tracking to align with frontend batch-processing-service.
-- Safe-by-default: create-only, no drops/alters; wrap in a transaction when promoting.

-- Table: batch_jobs
-- Notes:
-- - team_id is optional; set NOT NULL if every job is team-scoped.
-- - status values: pending | processing | completed | failed | cancelled
-- - target_entity values: leads | properties (extend as needed)
-- - type values: csv_import | lead_verification | campaign_send | data_enrichment

CREATE TABLE IF NOT EXISTS batch_jobs (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(32),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    target_entity VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    progress JSONB,
    error TEXT,
    metadata JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS batch_jobs_team_status_idx ON batch_jobs(team_id, status);
CREATE INDEX IF NOT EXISTS batch_jobs_status_idx ON batch_jobs(status);

-- Table: batch_job_items
-- Notes:
-- - data/result store per-item payloads/results expected by the service (JSON).
-- - status values: pending | processing | completed | failed | skipped

CREATE TABLE IF NOT EXISTS batch_job_items (
    id SERIAL PRIMARY KEY,
    batch_job_id INTEGER NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    data JSONB,
    result JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS batch_job_items_job_idx ON batch_job_items(batch_job_id);
CREATE INDEX IF NOT EXISTS batch_job_items_status_idx ON batch_job_items(status);
