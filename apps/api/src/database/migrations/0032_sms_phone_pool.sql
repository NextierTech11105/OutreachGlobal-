-- Phase 9: SMS Phone Pool with Rotation State
-- Enables automatic round-robin rotation through SignalHouse SMS phone numbers
-- ADDITIVE ONLY - Does not modify existing tables

CREATE TABLE IF NOT EXISTS sms_phone_pool (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  signalhouse_number_id VARCHAR(100),
  worker_id VARCHAR(50), -- NULL = shared pool

  -- Rotation state
  rotation_index INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP,

  -- Metrics
  send_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  delivery_rate REAL,

  -- Rate limiting
  daily_send_count INTEGER NOT NULL DEFAULT 0,
  daily_limit_reset_at TIMESTAMP,

  -- Health
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_healthy BOOLEAN NOT NULL DEFAULT true,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_health_check_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Performance indexes for rotation queries
CREATE INDEX IF NOT EXISTS spp_team_idx ON sms_phone_pool(team_id);
CREATE INDEX IF NOT EXISTS spp_phone_idx ON sms_phone_pool(phone_number);
CREATE INDEX IF NOT EXISTS spp_worker_idx ON sms_phone_pool(team_id, worker_id);
CREATE INDEX IF NOT EXISTS spp_rotation_idx ON sms_phone_pool(team_id, worker_id, last_used_at);

-- Optional: Migrate existing worker_phone_assignments to sms_phone_pool
-- Run this MANUALLY if you want to seed the pool from existing data:
--
-- INSERT INTO sms_phone_pool (id, team_id, phone_number, worker_id, is_active, created_at, updated_at)
-- SELECT
--   'spp_' || SUBSTRING(id, 8),
--   team_id,
--   phone_number,
--   worker_id,
--   is_active,
--   created_at,
--   updated_at
-- FROM worker_phone_assignments
-- ON CONFLICT DO NOTHING;
