-- Enable RLS on critical tables for tenant isolation
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_lead_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_distress_scores ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies
-- Leads table
CREATE POLICY tenant_isolation_leads ON leads
  USING (team_id = current_setting('app.team_id', true)::text);

-- Campaigns table
CREATE POLICY tenant_isolation_campaigns ON campaigns
  USING (team_id = current_setting('app.team_id', true)::text);

-- Campaign sequences (via campaign FK)
CREATE POLICY tenant_isolation_campaign_sequences ON campaign_sequences
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE team_id = current_setting('app.team_id', true)::text
  ));

-- Messages table
CREATE POLICY tenant_isolation_messages ON messages
  USING (team_id = current_setting('app.team_id', true)::text);

-- Inbox items table
CREATE POLICY tenant_isolation_inbox_items ON inbox_items
  USING (team_id = current_setting('app.team_id', true)::text);

-- Unified lead cards table
CREATE POLICY tenant_isolation_unified_lead_cards ON unified_lead_cards
  USING (team_id = current_setting('app.team_id', true)::text);

-- Properties table
CREATE POLICY tenant_isolation_properties ON properties
  USING (team_id = current_setting('app.team_id', true)::text);

-- Property distress scores table
CREATE POLICY tenant_isolation_property_distress_scores ON property_distress_scores
  USING (team_id = current_setting('app.team_id', true)::text);

-- Allow bypass for service accounts (when app.team_id is not set or empty)
-- This allows background jobs and admin operations to access all data
CREATE POLICY service_bypass_leads ON leads
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');

CREATE POLICY service_bypass_campaigns ON campaigns
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');

CREATE POLICY service_bypass_campaign_sequences ON campaign_sequences
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');

CREATE POLICY service_bypass_messages ON messages
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');

CREATE POLICY service_bypass_inbox_items ON inbox_items
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');

CREATE POLICY service_bypass_unified_lead_cards ON unified_lead_cards
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');

CREATE POLICY service_bypass_properties ON properties
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');

CREATE POLICY service_bypass_property_distress_scores ON property_distress_scores
  USING (current_setting('app.team_id', true) IS NULL OR current_setting('app.team_id', true) = '');
