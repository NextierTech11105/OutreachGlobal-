-- Migration: 0037_buyer_personas_icp
-- Description: Growth OS - Buyer Personas & ICP (Ideal Customer Profile)
--
-- Tables:
--   - ideal_customer_profiles: ICP definitions with firmographics/demographics
--   - buyer_personas: Psychological profiles for targeting
--   - objection_patterns: Common objections and rebuttals
--   - persona_assignments: Lead → Persona mapping

-- =============================================================================
-- IDEAL CUSTOMER PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ideal_customer_profiles (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Company Criteria
    firmographics JSONB,
    -- Geographic Criteria
    geography JSONB,
    -- Contact Criteria
    demographics JSONB,
    -- Tech Stack Criteria
    technographics JSONB,

    -- Scoring Configuration
    scoring_weights JSONB,
    qualification_threshold INTEGER DEFAULT 70,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for ideal_customer_profiles
CREATE INDEX IF NOT EXISTS icp_team_idx ON ideal_customer_profiles(team_id);
CREATE INDEX IF NOT EXISTS icp_active_idx ON ideal_customer_profiles(team_id, is_active);
CREATE INDEX IF NOT EXISTS icp_default_idx ON ideal_customer_profiles(team_id, is_default);

-- =============================================================================
-- BUYER PERSONAS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS buyer_personas (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    icp_id VARCHAR(30),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Role Definition
    typical_titles JSONB,
    typical_departments JSONB,
    seniority_level VARCHAR(50),

    -- Decision-Making Profile
    decision_style VARCHAR(50), -- analytical, driver, amiable, expressive
    buying_stage VARCHAR(50), -- problem_aware, solution_aware, product_aware, most_aware
    typical_budget_authority VARCHAR(50),

    -- Communication Preferences
    preferred_tone VARCHAR(50) DEFAULT 'professional',
    preferred_channels JSONB,
    best_contact_times JSONB,

    -- Psychological Profile
    emotional_drivers JSONB,
    pain_points JSONB,
    messaging_guidance JSONB,

    -- Template Routing
    preferred_cartridge_categories JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for buyer_personas
CREATE INDEX IF NOT EXISTS bpr_team_idx ON buyer_personas(team_id);
CREATE INDEX IF NOT EXISTS bpr_icp_idx ON buyer_personas(icp_id);
CREATE INDEX IF NOT EXISTS bpr_active_idx ON buyer_personas(team_id, is_active);
CREATE INDEX IF NOT EXISTS bpr_tone_idx ON buyer_personas(preferred_tone);

-- =============================================================================
-- OBJECTION PATTERNS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS objection_patterns (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    persona_id VARCHAR(30),

    -- Objection Definition
    category VARCHAR(50) NOT NULL, -- price, timing, authority, need, trust, competition, status_quo
    pattern VARCHAR(500) NOT NULL,
    variations JSONB,

    -- Response Strategy
    rebuttal_strategy VARCHAR(50),
    rebuttals JSONB,

    -- Performance Tracking
    use_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for objection_patterns
CREATE INDEX IF NOT EXISTS obj_team_idx ON objection_patterns(team_id);
CREATE INDEX IF NOT EXISTS obj_persona_idx ON objection_patterns(persona_id);
CREATE INDEX IF NOT EXISTS obj_category_idx ON objection_patterns(category);
CREATE INDEX IF NOT EXISTS obj_active_idx ON objection_patterns(team_id, is_active);

-- =============================================================================
-- PERSONA ASSIGNMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS persona_assignments (
    id VARCHAR(30) PRIMARY KEY,
    team_id VARCHAR(30) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    lead_id VARCHAR(30) NOT NULL,
    persona_id VARCHAR(30) NOT NULL,
    icp_id VARCHAR(30),

    -- Assignment Details
    assigned_by VARCHAR(50),
    confidence REAL DEFAULT 1.0,
    match_reasons JSONB,

    -- ICP Scoring
    icp_score INTEGER,
    icp_score_breakdown JSONB,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for persona_assignments
CREATE INDEX IF NOT EXISTS pas_team_idx ON persona_assignments(team_id);
CREATE INDEX IF NOT EXISTS pas_lead_idx ON persona_assignments(lead_id);
CREATE INDEX IF NOT EXISTS pas_persona_idx ON persona_assignments(persona_id);
CREATE INDEX IF NOT EXISTS pas_icp_idx ON persona_assignments(icp_id);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE ideal_customer_profiles IS 'Growth OS: Defines target customer criteria (firmographics, demographics, geography)';
COMMENT ON TABLE buyer_personas IS 'Growth OS: Psychological profiles for message targeting and tone routing';
COMMENT ON TABLE objection_patterns IS 'Growth OS: Common objections and rebuttals for sales enablement';
COMMENT ON TABLE persona_assignments IS 'Growth OS: Maps leads to buyer personas for personalized outreach';

COMMENT ON COLUMN buyer_personas.decision_style IS 'DISC profile: analytical, driver, amiable, expressive';
COMMENT ON COLUMN buyer_personas.preferred_tone IS 'Message tone: professional, friendly, casual, urgent, consultative';
COMMENT ON COLUMN objection_patterns.category IS 'Objection type: price, timing, authority, need, trust, competition, status_quo';
