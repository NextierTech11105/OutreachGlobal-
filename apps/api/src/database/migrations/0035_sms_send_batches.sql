-- Migration: 0035_sms_send_batches
-- Description: SMS Send Batches - Full outbound campaign lifecycle tracking
--
-- Makes the core flow VISIBLE, MANAGEABLE, PREDICTABLE, REPEATABLE
-- Tracks: DATA PREP → CAMPAIGN PREP → APPROVAL → EXECUTION → DELIVERY → RESPONSE
--
-- New Tables:
--   - sms_send_batches: Batch-level campaign tracking
--   - sms_batch_leads: Per-lead status within batches (optional detailed tracking)

-- =============================================================================
-- SMS SEND BATCHES
-- =============================================================================
-- Tracks every outbound SMS campaign batch through the full lifecycle

CREATE TABLE IF NOT EXISTS sms_send_batches (
    -- Primary key (ULID with 'ssb' prefix)
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Batch identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_id VARCHAR(30),

    -- Status: draft → ready → approved → queued → sending → completed/cancelled/failed
    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    -- === Data Prep Counts (Stage 1-2) ===
    raw_count INTEGER NOT NULL DEFAULT 0,
    enriched_count INTEGER DEFAULT 0,
    validated_count INTEGER DEFAULT 0,
    dnc_clean_count INTEGER DEFAULT 0,
    ready_count INTEGER DEFAULT 0,

    -- === Campaign Prep (Stage 3) ===
    template_id VARCHAR(30),
    template_name VARCHAR(255),
    sample_message TEXT,
    worker_id VARCHAR(50),

    -- === Approval (Stage 4) ===
    approved_by VARCHAR(30),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,

    -- === Execution Progress (Stage 5-6) ===
    queued_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    api_failed_count INTEGER DEFAULT 0,

    -- === Delivery Status (Stage 7) ===
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    undelivered_count INTEGER DEFAULT 0,

    -- === Response Metrics (Stage 8-10) ===
    replied_count INTEGER DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    opted_out_count INTEGER DEFAULT 0,
    call_queue_count INTEGER DEFAULT 0,

    -- === Conversion Outcomes ===
    meetings_booked INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    revenue_generated REAL DEFAULT 0,

    -- === Cost Tracking ===
    estimated_cost REAL,
    actual_cost REAL,
    segment_count INTEGER DEFAULT 0,

    -- === Phone Pool Distribution ===
    phone_pool_stats JSONB,
    error_breakdown JSONB,

    -- === Timing ===
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_completion_at TIMESTAMPTZ,

    -- === Rate Limiting ===
    send_rate_per_minute INTEGER DEFAULT 60,
    send_interval_ms INTEGER DEFAULT 1000,

    -- === Timestamps ===
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sms_send_batches
CREATE INDEX IF NOT EXISTS ssb_team_status_idx ON sms_send_batches(team_id, status);
CREATE INDEX IF NOT EXISTS ssb_campaign_idx ON sms_send_batches(campaign_id);
CREATE INDEX IF NOT EXISTS ssb_pending_approval_idx ON sms_send_batches(team_id, status, approved_at);
CREATE INDEX IF NOT EXISTS ssb_team_created_idx ON sms_send_batches(team_id, created_at);
CREATE INDEX IF NOT EXISTS ssb_scheduled_idx ON sms_send_batches(scheduled_at, status);

-- =============================================================================
-- SMS BATCH LEADS (Optional detailed tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sms_batch_leads (
    -- Primary key (ULID with 'sbl' prefix)
    id VARCHAR(30) PRIMARY KEY,
    batch_id VARCHAR(30) NOT NULL REFERENCES sms_send_batches(id) ON DELETE CASCADE,
    lead_id VARCHAR(30) NOT NULL,

    -- Lead status within batch
    status VARCHAR(20) DEFAULT 'pending',

    -- Tracking IDs
    sh_message_id VARCHAR(100),
    pool_phone_used VARCHAR(20),

    -- Timing
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,

    -- Error info
    error_code VARCHAR(20),
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sms_batch_leads
CREATE INDEX IF NOT EXISTS sbl_batch_idx ON sms_batch_leads(batch_id);
CREATE INDEX IF NOT EXISTS sbl_lead_idx ON sms_batch_leads(lead_id);
CREATE INDEX IF NOT EXISTS sbl_batch_status_idx ON sms_batch_leads(batch_id, status);
CREATE INDEX IF NOT EXISTS sbl_sh_message_idx ON sms_batch_leads(sh_message_id);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE sms_send_batches IS 'Tracks outbound SMS campaign batches through full lifecycle: data prep → delivery → conversion';
COMMENT ON COLUMN sms_send_batches.status IS 'Batch status: draft → ready → approved → queued → sending → paused → completed | cancelled | failed';
COMMENT ON COLUMN sms_send_batches.raw_count IS 'Initial lead count before any filtering';
COMMENT ON COLUMN sms_send_batches.ready_count IS 'Final sendable count after enrichment, validation, DNC scrub';
COMMENT ON COLUMN sms_send_batches.phone_pool_stats IS 'JSON tracking sends per pool phone: {"phoneNumber": {sent, delivered, failed}}';
COMMENT ON COLUMN sms_send_batches.error_breakdown IS 'JSON tracking error codes: {"30003": 15, "30007": 3}';

COMMENT ON TABLE sms_batch_leads IS 'Optional per-lead tracking within batches for detailed status visibility';
