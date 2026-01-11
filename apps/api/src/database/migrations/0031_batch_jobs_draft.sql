-- ============================================================
-- BATCH JOBS MIGRATION (Draft - DO NOT RUN WITHOUT REVIEW)
-- ============================================================
-- Creates batch_jobs and batch_job_items tables for durable
-- batch processing (replaces in-memory Map storage).
--
-- SAFE: CREATE ONLY - No DROP, ALTER, or destructive operations
-- ============================================================

-- Create batch_jobs table
CREATE TABLE IF NOT EXISTS batch_jobs (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL,

    -- Job classification
    type VARCHAR(50) NOT NULL,  -- csv_import, skip_trace, campaign_send, etc.
    target_entity VARCHAR(50),  -- leads, properties

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Values: pending, processing, completed, failed, paused, scheduled

    -- Job configuration (JSON)
    config JSONB,

    -- Progress tracking (JSON)
    progress JSONB DEFAULT '{"total": 0, "processed": 0, "successful": 0, "failed": 0}',

    -- Daily usage tracking (JSON)
    daily_usage JSONB,

    -- SMS queue integration results (JSON)
    sms_queue JSONB,

    -- Audit fields
    created_by VARCHAR(255),
    scheduled_for TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create batch_job_items table
CREATE TABLE IF NOT EXISTS batch_job_items (
    id SERIAL PRIMARY KEY,
    batch_job_id INTEGER NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,

    -- Item status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Values: pending, processing, completed, failed

    -- Input data (JSON)
    data JSONB,

    -- Output/result data (JSON)
    result JSONB,

    -- Error tracking
    error TEXT,

    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for batch_jobs
CREATE INDEX IF NOT EXISTS batch_jobs_team_idx ON batch_jobs(team_id);
CREATE INDEX IF NOT EXISTS batch_jobs_status_idx ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS batch_jobs_type_idx ON batch_jobs(type);
CREATE INDEX IF NOT EXISTS batch_jobs_scheduled_idx ON batch_jobs(scheduled_for);

-- Indexes for batch_job_items
CREATE INDEX IF NOT EXISTS batch_job_items_job_idx ON batch_job_items(batch_job_id);
CREATE INDEX IF NOT EXISTS batch_job_items_status_idx ON batch_job_items(status);

-- ============================================================
-- ROLLBACK (if needed):
-- DROP TABLE IF EXISTS batch_job_items;
-- DROP TABLE IF EXISTS batch_jobs;
-- ============================================================
