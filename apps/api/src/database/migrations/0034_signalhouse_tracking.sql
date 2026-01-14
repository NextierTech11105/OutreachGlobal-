-- Migration: 0034_signalhouse_tracking
-- Description: Complete SignalHouse message tracking and webhook audit logging
--
-- New Tables:
--   - signalhouse_message_status: Track delivery status per message
--   - signalhouse_webhook_log: Audit trail of all webhooks
--
-- These tables fill gaps in our SignalHouse integration:
--   - Message-level delivery tracking (queued → sent → delivered/failed)
--   - Error code tracking for health monitoring
--   - Webhook audit log for debugging and replay

-- =============================================================================
-- SIGNALHOUSE MESSAGE STATUS
-- =============================================================================
-- Tracks delivery lifecycle for every outbound message
-- Updated via SignalHouse webhooks

CREATE TABLE IF NOT EXISTS signalhouse_message_status (
    -- Primary key (ULID with 'sms' prefix)
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- SignalHouse IDs
    sh_message_id VARCHAR(100) NOT NULL,        -- msg_xxx from SignalHouse
    sh_subgroup_id VARCHAR(100),                -- For routing verification
    sh_campaign_id VARCHAR(100),                -- Which 10DLC campaign

    -- Our internal references (nullable for flexibility)
    message_id VARCHAR(30),                     -- FK to messages table
    lead_id VARCHAR(30),                        -- FK to leads table
    campaign_id VARCHAR(30),                    -- Our internal campaign

    -- Phone numbers (E.164 format)
    from_number VARCHAR(20) NOT NULL,           -- Our number
    to_number VARCHAR(20) NOT NULL,             -- Lead's number

    -- Delivery status
    -- queued → sending → sent → delivered
    --                        → undelivered
    --                        → failed
    --                        → blocked
    status VARCHAR(20) NOT NULL DEFAULT 'queued',

    -- Timing
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,                        -- When sent to carrier
    delivered_at TIMESTAMPTZ,                   -- When confirmed on handset
    failed_at TIMESTAMPTZ,                      -- When failure confirmed

    -- Error tracking
    error_code VARCHAR(20),                     -- 30003, 30007, etc
    error_message TEXT,                         -- Human-readable error
    carrier_code VARCHAR(50),                   -- Carrier-specific code
    carrier_name VARCHAR(100),                  -- AT&T, Verizon, etc

    -- Metadata
    segment_count INTEGER DEFAULT 1,            -- SMS segments (for billing)
    direction VARCHAR(10) DEFAULT 'outbound',   -- outbound | inbound

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for signalhouse_message_status
CREATE INDEX IF NOT EXISTS shms_sh_message_idx ON signalhouse_message_status(sh_message_id);
CREATE INDEX IF NOT EXISTS shms_team_status_idx ON signalhouse_message_status(team_id, status);
CREATE INDEX IF NOT EXISTS shms_from_status_idx ON signalhouse_message_status(from_number, status);
CREATE INDEX IF NOT EXISTS shms_lead_idx ON signalhouse_message_status(lead_id);
CREATE INDEX IF NOT EXISTS shms_team_created_idx ON signalhouse_message_status(team_id, created_at);
CREATE INDEX IF NOT EXISTS shms_error_idx ON signalhouse_message_status(team_id, error_code);

-- =============================================================================
-- SIGNALHOUSE WEBHOOK LOG
-- =============================================================================
-- Audit trail of every webhook received from SignalHouse
-- Enables debugging, replay, and compliance audit

CREATE TABLE IF NOT EXISTS signalhouse_webhook_log (
    -- Primary key (ULID with 'shw' prefix)
    id VARCHAR(30) PRIMARY KEY,

    -- Event identity
    sh_event_id VARCHAR(100),                   -- SignalHouse event ID (if provided)
    event_type VARCHAR(50) NOT NULL,            -- message.sent, message.delivered, etc

    -- Routing info
    team_id VARCHAR(30),                        -- Resolved team (null if couldn't resolve)
    sh_subgroup_id VARCHAR(100),                -- From payload
    sh_message_id VARCHAR(100),                 -- Related message

    -- Payload
    payload JSONB NOT NULL,                     -- Full webhook JSON
    headers JSONB,                              -- Request headers (for debugging)

    -- Processing status
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,                      -- If processing failed
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Request info (security audit)
    ip_address VARCHAR(45),                     -- IPv4 or IPv6
    user_agent VARCHAR(255),

    -- Timestamps
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for signalhouse_webhook_log
CREATE INDEX IF NOT EXISTS shwl_event_id_idx ON signalhouse_webhook_log(sh_event_id);
CREATE INDEX IF NOT EXISTS shwl_processed_idx ON signalhouse_webhook_log(processed, received_at);
CREATE INDEX IF NOT EXISTS shwl_team_idx ON signalhouse_webhook_log(team_id, received_at);
CREATE INDEX IF NOT EXISTS shwl_type_idx ON signalhouse_webhook_log(event_type, received_at);
CREATE INDEX IF NOT EXISTS shwl_message_idx ON signalhouse_webhook_log(sh_message_id);
CREATE INDEX IF NOT EXISTS shwl_subgroup_idx ON signalhouse_webhook_log(sh_subgroup_id);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE signalhouse_message_status IS 'Tracks delivery lifecycle for every SMS via SignalHouse webhooks';
COMMENT ON COLUMN signalhouse_message_status.sh_message_id IS 'SignalHouse message ID (msg_xxx) - primary lookup key for webhooks';
COMMENT ON COLUMN signalhouse_message_status.error_code IS 'SignalHouse/carrier error code: 30003=Unreachable, 30007=Carrier violation, etc';
COMMENT ON COLUMN signalhouse_message_status.status IS 'Delivery status: queued → sent → delivered | undelivered | failed | blocked';

COMMENT ON TABLE signalhouse_webhook_log IS 'Audit trail of all SignalHouse webhooks for debugging and replay';
COMMENT ON COLUMN signalhouse_webhook_log.processed IS 'Whether webhook has been successfully processed';
COMMENT ON COLUMN signalhouse_webhook_log.retry_count IS 'Number of processing retry attempts';

-- =============================================================================
-- SIGNALHOUSE ERROR CODES REFERENCE (as comment for documentation)
-- =============================================================================
/*
Common SignalHouse/Carrier Error Codes:

Carrier Errors:
  30001 - Queue overflow
  30002 - Account suspended
  30003 - Unreachable destination (most common)
  30004 - Message blocked
  30005 - Unknown destination
  30006 - Landline or unreachable
  30007 - Carrier violation (spam/filtering)
  30008 - Unknown error

Content Errors:
  30009 - Missing segment
  30010 - Message too long

Number Errors:
  30011 - Invalid 'to' number
  30012 - Invalid 'from' number

Rate Limiting:
  30022 - Exceeded throughput limit
  30023 - Rate limit exceeded

10DLC Specific:
  30034 - Campaign not approved
  30035 - Brand not verified
*/
