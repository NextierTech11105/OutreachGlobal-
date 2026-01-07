-- Migration: Add from_phone column to sms_messages table
-- This migration adds the missing from_phone column that is required for SMS message tracking
-- Related to emergency recovery for production deployment

-- First, check if the sms_messages table exists, if not create it
CREATE TABLE IF NOT EXISTS sms_messages (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  campaign_id VARCHAR(36),
  to_phone VARCHAR(20),
  body TEXT,
  status VARCHAR(50),
  external_id VARCHAR(255),
  direction VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Add from_phone column if it doesn't exist
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS from_phone VARCHAR(20);

-- Create index on from_phone for better query performance
CREATE INDEX IF NOT EXISTS idx_sms_from_phone 
ON sms_messages(from_phone);

-- Create index on to_phone if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_sms_to_phone 
ON sms_messages(to_phone);

-- Create index on team_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_sms_team_id 
ON sms_messages(team_id);

-- Create index on lead_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_sms_lead_id 
ON sms_messages(lead_id);

-- Create index on campaign_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_sms_campaign_id 
ON sms_messages(campaign_id);

-- Create index on status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_sms_status 
ON sms_messages(status);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_sms_created_at 
ON sms_messages(created_at);
