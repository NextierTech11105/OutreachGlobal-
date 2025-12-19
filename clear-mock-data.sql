-- SQL Script to Clear Mock/Demo Data
-- Run this against your production database

-- CAUTION: This will delete ALL data. Only run if you want to start fresh.

-- Clear leads (this will cascade to related tables due to foreign keys)
DELETE FROM leads WHERE id LIKE 'lead_%';

-- Clear businesses
DELETE FROM businesses WHERE id LIKE 'biz_%';

-- Clear properties
DELETE FROM properties WHERE id LIKE 'prop_%';

-- Clear contacts
DELETE FROM contacts WHERE id LIKE 'cont_%';

-- Clear campaigns
DELETE FROM campaigns WHERE id LIKE 'camp_%';

-- Clear inbox items
DELETE FROM "inboxItems" WHERE id LIKE 'inb_%';

-- Verify empty tables
SELECT 'leads' as table_name, COUNT(*) as count FROM leads
UNION ALL
SELECT 'businesses', COUNT(*) FROM businesses
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'inboxItems', COUNT(*) FROM "inboxItems";
