import { NextResponse } from "next/server";
import postgres from "postgres";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function POST() {
  // SECURITY: Only super admins can run migrations
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Forbidden: Super admin access required" },
      { status: 403 },
    );
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL not set" },
      { status: 500 },
    );
  }

  try {
    const sql = postgres(databaseUrl, { ssl: "require" });

    const results: string[] = [];

    // Create businesses table for datalake
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS businesses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          data_source_id UUID,
          user_id TEXT NOT NULL,
          external_id TEXT,
          ein TEXT,
          duns TEXT,
          company_name TEXT NOT NULL,
          dba TEXT,
          legal_name TEXT,
          entity_type TEXT,
          address TEXT,
          address_2 TEXT,
          city TEXT,
          state TEXT,
          zip TEXT,
          zip_4 TEXT,
          county TEXT,
          country TEXT DEFAULT 'US',
          latitude DECIMAL(10,7),
          longitude DECIMAL(10,7),
          phone TEXT,
          phone_alt TEXT,
          fax TEXT,
          email TEXT,
          website TEXT,
          sic_code TEXT,
          sic_code_2 TEXT,
          sic_code_3 TEXT,
          sic_description TEXT,
          naics_code TEXT,
          naics_description TEXT,
          employee_count INTEGER,
          employee_range TEXT,
          annual_revenue INTEGER,
          revenue_range TEXT,
          sales_volume TEXT,
          year_established INTEGER,
          years_in_business INTEGER,
          is_headquarters BOOLEAN DEFAULT true,
          parent_company TEXT,
          franchise_flag BOOLEAN DEFAULT false,
          owner_name TEXT,
          owner_first_name TEXT,
          owner_last_name TEXT,
          owner_title TEXT,
          owner_gender TEXT,
          owner_phone TEXT,
          owner_email TEXT,
          executive_name TEXT,
          executive_title TEXT,
          executive_phone TEXT,
          executive_email TEXT,
          primary_sector_id TEXT,
          secondary_sector_ids JSONB DEFAULT '[]',
          status TEXT DEFAULT 'new',
          score INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      results.push("Created businesses table");
    } catch (e: any) {
      results.push(`businesses: ${e.message}`);
    }

    // Create data_sources table for tracking imports
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS data_sources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          source_type TEXT DEFAULT 'csv',
          source_provider TEXT,
          file_name TEXT,
          file_url TEXT,
          status TEXT DEFAULT 'pending',
          total_rows INTEGER DEFAULT 0,
          processed_rows INTEGER DEFAULT 0,
          error_message TEXT,
          metadata JSONB DEFAULT '{}',
          processed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      results.push("Created data_sources table");
    } catch (e: any) {
      results.push(`data_sources: ${e.message}`);
    }

    // Create indexes for faster queries
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_businesses_sector ON businesses(primary_sector_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_businesses_state ON businesses(state)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_businesses_sic ON businesses(sic_code)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id)`;
      results.push("Created business indexes");
    } catch (e: any) {
      results.push(`indexes: ${e.message}`);
    }

    // Add branding column if it doesn't exist
    try {
      await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS branding JSONB`;
      results.push("Added branding column to teams");
    } catch (e: any) {
      results.push(`branding: ${e.message}`);
    }

    // Add description column if it doesn't exist
    try {
      await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT`;
      results.push("Added description column to teams");
    } catch (e: any) {
      results.push(`description: ${e.message}`);
    }

    // Create api_keys table for API key authentication
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(32) PRIMARY KEY,
          key_hash VARCHAR(128) NOT NULL,
          key_prefix VARCHAR(16) NOT NULL,
          type VARCHAR(20) NOT NULL DEFAULT 'USER',
          team_id VARCHAR(32) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          user_id VARCHAR(32) REFERENCES users(id) ON DELETE SET NULL,
          name VARCHAR(100) NOT NULL,
          description VARCHAR(500),
          permissions JSONB,
          rate_limit VARCHAR(20) DEFAULT '1000/hour',
          is_active BOOLEAN NOT NULL DEFAULT true,
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      results.push("Created api_keys table");
    } catch (e: any) {
      results.push(`api_keys: ${e.message}`);
    }

    // Create indexes for api_keys
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_team ON api_keys(team_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)`;
      results.push("Created api_keys indexes");
    } catch (e: any) {
      results.push(`api_keys indexes: ${e.message}`);
    }

    await sql.end();

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
