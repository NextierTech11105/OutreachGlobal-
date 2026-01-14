-- Migration: 0036_meetings_engine
-- Description: Growth OS - Meetings Engine schema
--
-- Tables:
--   - meetings: Core meeting tracking with state machine
--   - meeting_attendees: Multi-attendee support
--   - meeting_outcomes: Detailed outcome logging
--   - qualification_rules: ICP-based qualification criteria

-- =============================================================================
-- MEETINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Lead/Contact Info
    lead_id VARCHAR(30),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    company_name VARCHAR(255),

    -- Meeting Details
    type VARCHAR(20) NOT NULL, -- discovery_15, strategy_45, strategy_60, demo, follow_up, closing
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 15,

    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    scheduled_end_at TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    calendar_event_id VARCHAR(255),
    meeting_link VARCHAR(500),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, reminded, in_progress, completed, no_show, rescheduled, cancelled
    confirmed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    -- Outcome & Qualification
    outcome VARCHAR(20), -- qualified, not_qualified, nurture, follow_up, proposal_sent, closed_won, closed_lost, no_decision
    outcome_notes TEXT,
    qualification_stage VARCHAR(20) DEFAULT 'unqualified', -- unqualified, mql, sql, opportunity, proposal, negotiation, closed

    -- Assignment
    host_user_id VARCHAR(30),
    host_name VARCHAR(255),

    -- Source Tracking
    source_channel VARCHAR(50), -- sms, email, call, web
    source_campaign_id VARCHAR(30),
    source_lead_id VARCHAR(30),

    -- Reminders
    reminder_24h_sent BOOLEAN DEFAULT false,
    reminder_1h_sent BOOLEAN DEFAULT false,
    reminder_15m_sent BOOLEAN DEFAULT false,

    -- No-Show Handling
    no_show_follow_up_sent BOOLEAN DEFAULT false,
    reschedule_count INTEGER DEFAULT 0,
    original_meeting_id VARCHAR(30),

    -- Recording & Notes
    recording_url VARCHAR(500),
    transcript_url VARCHAR(500),
    meeting_notes TEXT,

    -- Revenue Attribution
    deal_value REAL,
    deal_currency VARCHAR(3) DEFAULT 'USD',

    -- Metadata
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for meetings
CREATE INDEX IF NOT EXISTS mtg_team_idx ON meetings(team_id);
CREATE INDEX IF NOT EXISTS mtg_lead_idx ON meetings(lead_id);
CREATE INDEX IF NOT EXISTS mtg_status_idx ON meetings(team_id, status);
CREATE INDEX IF NOT EXISTS mtg_scheduled_idx ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS mtg_host_idx ON meetings(host_user_id);
CREATE INDEX IF NOT EXISTS mtg_outcome_idx ON meetings(team_id, outcome);
CREATE INDEX IF NOT EXISTS mtg_qualification_idx ON meetings(team_id, qualification_stage);

-- =============================================================================
-- MEETING ATTENDEES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meeting_attendees (
    id VARCHAR(30) PRIMARY KEY,
    meeting_id VARCHAR(30) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Attendee info
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50), -- host, attendee, optional

    -- Response
    response_status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, tentative
    responded_at TIMESTAMPTZ,

    -- Attendance
    attended BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for meeting_attendees
CREATE INDEX IF NOT EXISTS mta_meeting_idx ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS mta_email_idx ON meeting_attendees(email);

-- =============================================================================
-- MEETING OUTCOMES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS meeting_outcomes (
    id VARCHAR(30) PRIMARY KEY,
    meeting_id VARCHAR(30) NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Outcome Details
    outcome VARCHAR(20) NOT NULL,
    previous_stage VARCHAR(20),
    new_stage VARCHAR(20),

    -- Notes & Feedback
    notes TEXT,
    next_steps TEXT,
    objections JSONB, -- Array of objection strings
    interests JSONB, -- Array of interest strings

    -- Deal Info
    estimated_deal_value REAL,
    estimated_close_date TIMESTAMPTZ,
    probability INTEGER, -- 0-100

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date TIMESTAMPTZ,
    follow_up_type VARCHAR(20),

    -- Who logged
    logged_by VARCHAR(30),
    logged_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for meeting_outcomes
CREATE INDEX IF NOT EXISTS mto_meeting_idx ON meeting_outcomes(meeting_id);
CREATE INDEX IF NOT EXISTS mto_team_idx ON meeting_outcomes(team_id);
CREATE INDEX IF NOT EXISTS mto_outcome_idx ON meeting_outcomes(outcome);

-- =============================================================================
-- QUALIFICATION RULES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS qualification_rules (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Criteria (JSON for flexibility)
    criteria JSONB,
    scoring_rules JSONB,
    qualification_threshold INTEGER DEFAULT 50,

    -- Stage mapping
    target_stage VARCHAR(20) DEFAULT 'sql',

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for qualification_rules
CREATE INDEX IF NOT EXISTS qrl_team_idx ON qualification_rules(team_id);
CREATE INDEX IF NOT EXISTS qrl_active_idx ON qualification_rules(team_id, is_active);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE meetings IS 'Growth OS: Tracks meetings from booking through outcome';
COMMENT ON COLUMN meetings.type IS 'Meeting type: discovery_15, strategy_45, strategy_60, demo, follow_up, closing';
COMMENT ON COLUMN meetings.status IS 'Meeting state: scheduled → confirmed → in_progress → completed (or no_show/cancelled)';
COMMENT ON COLUMN meetings.outcome IS 'Result: qualified, not_qualified, nurture, follow_up, proposal_sent, closed_won, closed_lost';
COMMENT ON COLUMN meetings.qualification_stage IS 'Sales stage: unqualified → mql → sql → opportunity → proposal → negotiation → closed';

COMMENT ON TABLE meeting_outcomes IS 'Detailed outcome logging with objections, interests, and deal tracking';
COMMENT ON TABLE qualification_rules IS 'ICP-based rules for qualifying leads (scoring criteria)';
