-- Migration: 0038_pre_meeting_briefs
-- Description: Growth OS - Pre-Meeting Briefs & Research Requests
--
-- Tables:
--   - pre_meeting_briefs: AI-generated meeting prep documents
--   - brief_templates: Customizable brief structures
--   - research_requests: On-demand research for meetings

-- =============================================================================
-- PRE-MEETING BRIEFS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS pre_meeting_briefs (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    meeting_id VARCHAR(30) NOT NULL,
    lead_id VARCHAR(30),

    -- Source References
    enrichment_id VARCHAR(30),
    persona_id VARCHAR(30),
    icp_id VARCHAR(30),

    -- Status
    status VARCHAR(20) DEFAULT 'generating',
    generated_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(30),

    -- Content
    executive_summary TEXT,
    meeting_objective TEXT,
    success_criteria JSONB,

    -- Intelligence Snapshots
    company_snapshot JSONB,
    contact_snapshot JSONB,
    persona_insights JSONB,

    -- Talking Points & Objections
    talking_points JSONB,
    anticipated_objections JSONB,

    -- Signals & Risks
    buying_signals JSONB,
    risk_factors JSONB,
    competitive_intel JSONB,

    -- Actions
    pre_call_actions JSONB,
    post_call_actions JSONB,

    -- Effectiveness Tracking
    was_useful BOOLEAN,
    usefulness_rating INTEGER,
    feedback_notes TEXT,

    -- Metadata
    source_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for pre_meeting_briefs
CREATE INDEX IF NOT EXISTS pmb_team_idx ON pre_meeting_briefs(team_id);
CREATE INDEX IF NOT EXISTS pmb_meeting_idx ON pre_meeting_briefs(meeting_id);
CREATE INDEX IF NOT EXISTS pmb_lead_idx ON pre_meeting_briefs(lead_id);
CREATE INDEX IF NOT EXISTS pmb_status_idx ON pre_meeting_briefs(team_id, status);

-- =============================================================================
-- BRIEF TEMPLATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS brief_templates (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Configuration
    meeting_types JSONB,
    sections JSONB,

    -- AI Settings
    ai_model VARCHAR(50) DEFAULT 'gpt-4',
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for brief_templates
CREATE INDEX IF NOT EXISTS brt_team_idx ON brief_templates(team_id);
CREATE INDEX IF NOT EXISTS brt_active_idx ON brief_templates(team_id, is_active);

-- =============================================================================
-- RESEARCH REQUESTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS research_requests (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    meeting_id VARCHAR(30),
    brief_id VARCHAR(30),
    requested_by VARCHAR(30),

    -- Request Details
    type VARCHAR(50) NOT NULL,
    target VARCHAR(500) NOT NULL,
    questions JSONB,
    context TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,

    -- Results
    findings JSONB,

    -- Timing
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for research_requests
CREATE INDEX IF NOT EXISTS rsr_team_idx ON research_requests(team_id);
CREATE INDEX IF NOT EXISTS rsr_meeting_idx ON research_requests(meeting_id);
CREATE INDEX IF NOT EXISTS rsr_brief_idx ON research_requests(brief_id);
CREATE INDEX IF NOT EXISTS rsr_status_idx ON research_requests(status);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE pre_meeting_briefs IS 'Growth OS: AI-generated meeting prep with company/contact intelligence';
COMMENT ON TABLE brief_templates IS 'Growth OS: Customizable brief structures per team';
COMMENT ON TABLE research_requests IS 'Growth OS: On-demand research requests for meetings';

COMMENT ON COLUMN pre_meeting_briefs.status IS 'Brief status: generating, ready, reviewed, used, archived';
COMMENT ON COLUMN pre_meeting_briefs.persona_insights IS 'Mapped buyer persona with emotional drivers and communication preferences';
COMMENT ON COLUMN pre_meeting_briefs.anticipated_objections IS 'Predicted objections with rebuttals based on persona';
