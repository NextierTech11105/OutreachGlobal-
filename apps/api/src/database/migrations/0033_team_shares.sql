-- Phase 10: Team Shares - Cross-Team Collaboration
-- Enables sharing leads and campaigns between teams/agencies
-- ADDITIVE ONLY - Does not modify existing tables

-- Team Shares table - tracks what's shared between teams
CREATE TABLE IF NOT EXISTS team_shares (
  id VARCHAR(36) PRIMARY KEY,

  -- Source team (who is sharing)
  source_team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  shared_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

  -- Target team (who receives the share)
  target_team_id VARCHAR(36) NOT NULL,
  accepted_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

  -- What is being shared
  resource_type VARCHAR(50) NOT NULL, -- 'lead', 'campaign', 'campaign_template', 'lead_list', 'bucket'
  resource_id VARCHAR(36) NOT NULL,
  resource_name VARCHAR(255),

  -- Permission level
  permission VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view', 'edit', 'full', 'clone_only'

  -- Share status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'revoked'

  -- Optional message from sharer
  message TEXT,

  -- Metadata (JSON)
  metadata JSONB,

  -- Expiration (null = permanent)
  expires_at TIMESTAMP,

  -- Status timestamps
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  revoked_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for team_shares
CREATE INDEX IF NOT EXISTS team_shares_source_idx ON team_shares(source_team_id);
CREATE INDEX IF NOT EXISTS team_shares_target_idx ON team_shares(target_team_id);
CREATE INDEX IF NOT EXISTS team_shares_resource_idx ON team_shares(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS team_shares_status_idx ON team_shares(status);

-- Campaign Templates table - reusable campaign configurations
CREATE TABLE IF NOT EXISTS campaign_templates (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'exit_planning', 'm&a', 'real_estate', etc.

  -- Template content (JSON)
  template_data JSONB NOT NULL,

  -- Sharing settings
  is_public BOOLEAN NOT NULL DEFAULT false, -- Visible in marketplace
  is_shareable BOOLEAN NOT NULL DEFAULT true, -- Can be shared
  price VARCHAR(50), -- If selling (null = free)

  -- Stats
  use_count INTEGER DEFAULT 0,
  rating JSONB,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for campaign_templates
CREATE INDEX IF NOT EXISTS campaign_templates_team_idx ON campaign_templates(team_id);
CREATE INDEX IF NOT EXISTS campaign_templates_category_idx ON campaign_templates(category);
CREATE INDEX IF NOT EXISTS campaign_templates_public_idx ON campaign_templates(is_public);

-- Example: Share a lead from Team A to Team B
-- INSERT INTO team_shares (id, source_team_id, target_team_id, resource_type, resource_id, permission, status)
-- VALUES ('tsh_xxx', 'team_a', 'team_b', 'lead', 'lead_123', 'view', 'pending');

-- Example: Create a shareable campaign template
-- INSERT INTO campaign_templates (id, team_id, name, template_data, is_public)
-- VALUES ('ctpl_xxx', 'team_a', 'Exit Planning Sequence', '{"messages": [...]}', true);
