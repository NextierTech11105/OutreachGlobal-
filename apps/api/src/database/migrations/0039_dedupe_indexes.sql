-- Dedupe Indexes for Bulk Import Performance
-- These indexes speed up phone/email/company lookups during import deduplication

-- Businesses: Normalized phone lookup (extract digits only)
CREATE INDEX IF NOT EXISTS idx_businesses_phone_normalized
ON businesses (regexp_replace(phone, '[^0-9]', '', 'g'))
WHERE phone IS NOT NULL;

-- Businesses: Company name + city + state for name-based dedupe
CREATE INDEX IF NOT EXISTS idx_businesses_company_location
ON businesses (LOWER(company_name), LOWER(city), LOWER(state))
WHERE company_name IS NOT NULL;

-- Businesses: User + company for faster user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_businesses_user_company
ON businesses (user_id, LOWER(company_name));

-- Contacts: Normalized phone lookup
CREATE INDEX IF NOT EXISTS idx_contacts_phone_normalized
ON contacts (regexp_replace(phone, '[^0-9]', '', 'g'))
WHERE phone IS NOT NULL;

-- Contacts: Email lookup (lowercase)
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower
ON contacts (LOWER(email))
WHERE email IS NOT NULL;

-- Contacts: User + phone for faster user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_contacts_user_phone
ON contacts (user_id, phone)
WHERE phone IS NOT NULL;

-- Leads: Normalized phone lookup for identity dedupe
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized
ON leads (regexp_replace(phone, '[^0-9]', '', 'g'))
WHERE phone IS NOT NULL;

-- Leads: Email lookup (lowercase)
CREATE INDEX IF NOT EXISTS idx_leads_email_lower
ON leads (LOWER(email))
WHERE email IS NOT NULL;

-- Leads: Last name for name-based matching
CREATE INDEX IF NOT EXISTS idx_leads_lastname_lower
ON leads (LOWER(last_name))
WHERE last_name IS NOT NULL;
