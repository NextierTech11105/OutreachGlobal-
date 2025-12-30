-- ============================================================================
-- SAFE MIGRATIONS: OutreachGlobal Multi-Tenant Data Architecture Fixes
-- ============================================================================
-- Generated: 2024-12-30
-- Purpose: Non-destructive migrations to fix tenant isolation issues
--
-- IMPORTANT:
-- - All migrations are SAFE and NON-DESTRUCTIVE
-- - Use CONCURRENTLY for indexes to avoid table locks
-- - Run in a transaction with ROLLBACK capability
-- - Test in staging before production
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD MISSING team_id COLUMNS (P0 - CRITICAL)
-- ============================================================================

-- businesses: Currently missing team_id
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS team_id VARCHAR(36);

-- Add foreign key constraint (after backfilling existing data)
-- ALTER TABLE businesses
-- ADD CONSTRAINT businesses_team_id_fk
-- FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- buckets: Currently missing team_id
ALTER TABLE buckets
ADD COLUMN IF NOT EXISTS team_id VARCHAR(36);

-- data_sources: Currently missing team_id
ALTER TABLE data_sources
ADD COLUMN IF NOT EXISTS team_id VARCHAR(36);

-- sms_messages: Currently missing team_id (has lead FK but should have direct)
ALTER TABLE sms_messages
ADD COLUMN IF NOT EXISTS team_id VARCHAR(36);

-- ============================================================================
-- PHASE 2: ADD MISSING FOREIGN KEY CONSTRAINTS (P1 - HIGH)
-- ============================================================================

-- personas: Has team_id column but no FK constraint
ALTER TABLE personas
ADD CONSTRAINT IF NOT EXISTS personas_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- persona_phones
ALTER TABLE persona_phones
ADD CONSTRAINT IF NOT EXISTS persona_phones_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- persona_emails
ALTER TABLE persona_emails
ADD CONSTRAINT IF NOT EXISTS persona_emails_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- persona_addresses
ALTER TABLE persona_addresses
ADD CONSTRAINT IF NOT EXISTS persona_addresses_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- persona_demographics
ALTER TABLE persona_demographics
ADD CONSTRAINT IF NOT EXISTS persona_demographics_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- persona_socials
ALTER TABLE persona_socials
ADD CONSTRAINT IF NOT EXISTS persona_socials_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- business_owners
ALTER TABLE business_owners
ADD CONSTRAINT IF NOT EXISTS business_owners_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- property_owners
ALTER TABLE property_owners
ADD CONSTRAINT IF NOT EXISTS property_owners_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- unified_lead_cards
ALTER TABLE unified_lead_cards
ADD CONSTRAINT IF NOT EXISTS unified_lead_cards_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- inbox_items
ALTER TABLE inbox_items
ADD CONSTRAINT IF NOT EXISTS inbox_items_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- suppression_list
ALTER TABLE suppression_list
ADD CONSTRAINT IF NOT EXISTS suppression_list_team_id_fk
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================================
-- PHASE 3: ADD MISSING INDEXES ON team_id (P0 - CRITICAL)
-- ============================================================================
-- Using CONCURRENTLY to avoid table locks

-- Hot communication tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_team_id
ON messages(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inbox_items_team_id
ON inbox_items(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_queue_team_id
ON campaign_queue(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_events_team_id
ON scheduled_events(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outreach_logs_team_id
ON outreach_logs(team_id);

-- Hot intelligence tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_log_team_id
ON intelligence_log(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_activities_team_id
ON lead_activities(team_id);

-- Campaign management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_team_id
ON campaigns(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unified_lead_cards_team_id
ON unified_lead_cards(team_id);

-- PII tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personas_team_id
ON personas(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_phones_team_id
ON persona_phones(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_emails_team_id
ON persona_emails(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_addresses_team_id
ON persona_addresses(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_demographics_team_id
ON persona_demographics(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_socials_team_id
ON persona_socials(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppression_list_team_id
ON suppression_list(team_id);

-- Other tenant tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_sdr_avatars_team_id ON ai_sdr_avatars(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_templates_team_id ON message_templates(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_team_id ON appointments(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shared_links_team_id ON shared_links(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skiptrace_jobs_team_id ON skiptrace_jobs(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skiptrace_results_team_id ON skiptrace_results(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_team_id ON knowledge_documents(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_response_buckets_team_id ON response_buckets(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_plays_team_id ON automation_plays(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cadence_templates_team_id ON cadence_templates(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sdr_campaign_configs_team_id ON sdr_campaign_configs(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_worker_personalities_team_id ON worker_personalities(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompts_team_id ON prompts(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_owners_team_id ON business_owners(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_owners_team_id ON property_owners(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_metrics_team_id ON intelligence_metrics(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_labels_team_id ON conversation_labels(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sdr_sessions_team_id ON sdr_sessions(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_merge_history_team_id ON persona_merge_history(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_initial_messages_team_id ON initial_messages(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_initial_messages_team_id ON campaign_initial_messages(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_cadences_team_id ON campaign_cadences(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_snapshots_team_id ON leaderboard_snapshots(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_achievements_team_id ON user_achievements(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_team_id ON user_stats(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievement_notifications_team_id ON achievement_notifications(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_worker_voice_configs_team_id ON worker_voice_configs(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_searches_team_id ON property_searches(team_id);

-- ============================================================================
-- PHASE 4: ADD COMPOSITE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Messages by team and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_team_status
ON messages(team_id, status);

-- Inbox items by team and bucket
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inbox_items_team_bucket
ON inbox_items(team_id, current_bucket);

-- Scheduled events by team and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_events_team_status
ON scheduled_events(team_id, status);

-- Campaign queue by team and priority
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_queue_team_priority
ON campaign_queue(team_id, priority DESC, scheduled_at ASC);

-- Leads by team and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_team_status
ON leads(team_id, status);

-- Intelligence log by team and type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_log_team_type
ON intelligence_log(team_id, event_type);

-- ============================================================================
-- PHASE 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Create function to get current tenant
CREATE OR REPLACE FUNCTION get_current_team_id()
RETURNS VARCHAR(36) AS $$
BEGIN
  RETURN current_setting('app.team_id', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create service bypass role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nextier_service') THEN
    CREATE ROLE nextier_service;
  END IF;
END
$$;

-- Enable RLS on core tenant tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_lead_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies
CREATE POLICY leads_tenant_policy ON leads
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY campaigns_tenant_policy ON campaigns
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY messages_tenant_policy ON messages
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY personas_tenant_policy ON personas
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY inbox_items_tenant_policy ON inbox_items
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY unified_lead_cards_tenant_policy ON unified_lead_cards
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY persona_phones_tenant_policy ON persona_phones
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY persona_emails_tenant_policy ON persona_emails
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY persona_addresses_tenant_policy ON persona_addresses
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY persona_demographics_tenant_policy ON persona_demographics
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY intelligence_log_tenant_policy ON intelligence_log
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY outreach_logs_tenant_policy ON outreach_logs
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY suppression_list_tenant_policy ON suppression_list
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY integrations_tenant_policy ON integrations
FOR ALL USING (team_id = current_setting('app.team_id', true));

CREATE POLICY api_keys_tenant_policy ON api_keys
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- Shared reference tables (read-only)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY properties_read_policy ON properties
FOR SELECT USING (true);

ALTER TABLE property_distress_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY property_distress_read_policy ON property_distress_scores
FOR SELECT USING (true);

ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_tasks_read_policy ON workflow_tasks
FOR SELECT USING (true);

ALTER TABLE workflow_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_fields_read_policy ON workflow_fields
FOR SELECT USING (true);

ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY achievement_definitions_read_policy ON achievement_definitions
FOR SELECT USING (true);

-- ============================================================================
-- PHASE 6: AUDIT IMPROVEMENTS
-- ============================================================================

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at to tables missing it
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE suppression_list ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS set_messages_updated_at ON messages;
CREATE TRIGGER set_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_suppression_list_updated_at ON suppression_list;
CREATE TRIGGER set_suppression_list_updated_at
BEFORE UPDATE ON suppression_list
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add correlation_id support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64);
ALTER TABLE campaign_executions ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64);
ALTER TABLE intelligence_log ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_correlation
ON messages(correlation_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_exec_correlation
ON campaign_executions(correlation_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_correlation
ON intelligence_log(correlation_id);

-- ============================================================================
-- PHASE 7: CONSENT TRACKING TABLE (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36),
  phone VARCHAR(20),
  email VARCHAR(255),
  consent_type VARCHAR(50) NOT NULL,
  consent_given BOOLEAN NOT NULL,
  consent_method VARCHAR(50),
  consent_text TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  consented_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,

  CONSTRAINT consent_records_team_fk
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consent_team ON consent_records(team_id);
CREATE INDEX IF NOT EXISTS idx_consent_phone ON consent_records(phone);
CREATE INDEX IF NOT EXISTS idx_consent_lead ON consent_records(lead_id);

-- Enable RLS on consent_records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY consent_records_tenant_policy ON consent_records
FOR ALL USING (team_id = current_setting('app.team_id', true));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS status
-- SELECT relname, relrowsecurity, relforcerowsecurity
-- FROM pg_class
-- WHERE relnamespace = 'public'::regnamespace
-- AND relkind = 'r'
-- ORDER BY relname;

-- Check policies
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Check indexes on team_id
-- SELECT t.relname as table_name, i.relname as index_name
-- FROM pg_class t
-- JOIN pg_index ix ON t.oid = ix.indrelid
-- JOIN pg_class i ON i.oid = ix.indexrelid
-- JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
-- WHERE t.relnamespace = 'public'::regnamespace
-- AND a.attname = 'team_id'
-- ORDER BY t.relname;

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================

-- To rollback RLS:
-- ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS leads_tenant_policy ON leads;
-- (repeat for each table)

-- To rollback indexes:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_messages_team_id;
-- (repeat for each index)

-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
