const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulidx');

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    } : false,
    connectionTimeoutMillis: 30000
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Tables already exist, skipping schema creation');
    } else {
      console.log('🔄 Creating database tables...');

      // Create all tables from schema
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          role VARCHAR DEFAULT 'USER' NOT NULL,
          name VARCHAR NOT NULL,
          email VARCHAR NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email_verified_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR(36) PRIMARY KEY,
          owner_id VARCHAR(36) NOT NULL,
          name VARCHAR NOT NULL,
          slug VARCHAR NOT NULL,
          description TEXT,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS team_members (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36),
          role VARCHAR DEFAULT 'MEMBER' NOT NULL,
          status VARCHAR DEFAULT 'PENDING' NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS personal_access_tokens (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          name VARCHAR NOT NULL,
          expired_at TIMESTAMP,
          last_used_at TIMESTAMP,
          user_agent JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          integration_id VARCHAR(36),
          external_id VARCHAR,
          first_name VARCHAR,
          last_name VARCHAR,
          email VARCHAR,
          phone VARCHAR,
          title VARCHAR,
          company VARCHAR,
          status VARCHAR,
          score INTEGER DEFAULT 0 NOT NULL,
          tags TEXT[],
          zip_code VARCHAR,
          country VARCHAR,
          state VARCHAR,
          city VARCHAR,
          address VARCHAR,
          source VARCHAR,
          notes TEXT,
          metadata JSONB,
          custom_fields JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          property_id VARCHAR(36),
          position INTEGER DEFAULT 0 NOT NULL
        );

        CREATE TABLE IF NOT EXISTS campaigns (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          sdr_id VARCHAR(36),
          name VARCHAR NOT NULL,
          description TEXT,
          target_method VARCHAR DEFAULT 'SCORE_BASED' NOT NULL,
          min_score INTEGER NOT NULL,
          max_score INTEGER NOT NULL,
          location JSONB,
          status VARCHAR DEFAULT 'DRAFT' NOT NULL,
          estimated_leads_count INTEGER DEFAULT 0 NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          starts_at TIMESTAMP NOT NULL,
          ends_at TIMESTAMP,
          paused_at TIMESTAMP,
          resumed_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaign_leads (
          campaign_id VARCHAR(36) NOT NULL,
          lead_id VARCHAR(36) NOT NULL,
          current_sequence_position INTEGER DEFAULT 1 NOT NULL,
          current_sequence_status VARCHAR DEFAULT 'PENDING' NOT NULL,
          last_sequence_executed_at TIMESTAMP,
          next_sequence_run_at TIMESTAMP,
          status VARCHAR DEFAULT 'ACTIVE' NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          PRIMARY KEY (campaign_id, lead_id)
        );

        CREATE TABLE IF NOT EXISTS campaign_sequences (
          id VARCHAR(36) PRIMARY KEY,
          campaign_id VARCHAR(36) NOT NULL,
          type VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          position INTEGER NOT NULL,
          content TEXT NOT NULL,
          subject VARCHAR,
          voice_type VARCHAR,
          delay_days INTEGER DEFAULT 0 NOT NULL,
          delay_hours INTEGER DEFAULT 0 NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaign_events (
          id VARCHAR(36) PRIMARY KEY,
          campaign_id VARCHAR(36) NOT NULL,
          sequence_id VARCHAR(36),
          lead_id VARCHAR(36) NOT NULL,
          name VARCHAR NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaign_executions (
          id VARCHAR(36) PRIMARY KEY,
          campaign_id VARCHAR(36) NOT NULL,
          lead_id VARCHAR(36) NOT NULL,
          sequence_id VARCHAR(36) NOT NULL,
          status VARCHAR DEFAULT 'PENDING' NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          failed_reason TEXT
        );

        CREATE TABLE IF NOT EXISTS integrations (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          name VARCHAR NOT NULL,
          enabled BOOLEAN NOT NULL,
          settings JSONB,
          auth_data JSONB,
          token_expires_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS message_templates (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          type VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          lead_id VARCHAR(36),
          campaign_id VARCHAR(36),
          external_id VARCHAR,
          type VARCHAR NOT NULL,
          direction VARCHAR NOT NULL,
          to_name VARCHAR,
          to_address VARCHAR,
          from_name VARCHAR,
          from_address VARCHAR,
          subject VARCHAR,
          body TEXT,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          deleted_at TIMESTAMP,
          status VARCHAR DEFAULT 'ACTIVE' NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_sdr_avatars (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          name VARCHAR NOT NULL,
          description TEXT,
          personality VARCHAR NOT NULL,
          voice_type VARCHAR NOT NULL,
          avatar_uri VARCHAR,
          active BOOLEAN DEFAULT true,
          industry VARCHAR NOT NULL,
          mission VARCHAR NOT NULL,
          goal VARCHAR NOT NULL,
          roles TEXT[] DEFAULT '{}' NOT NULL,
          faqs JSONB DEFAULT '[]' NOT NULL,
          tags TEXT[] DEFAULT '{}' NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS prompts (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          name VARCHAR NOT NULL,
          type VARCHAR NOT NULL,
          category VARCHAR NOT NULL,
          description TEXT,
          content TEXT NOT NULL,
          tags TEXT[] DEFAULT '{}',
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS properties (
          id VARCHAR(36) PRIMARY KEY,
          external_id VARCHAR,
          source VARCHAR,
          owner_first_name VARCHAR,
          owner_last_name VARCHAR,
          use_code VARCHAR,
          owner_occupied BOOLEAN DEFAULT false,
          lot_square_feet NUMERIC(12,2),
          building_square_feet NUMERIC(12,2),
          auction_date TIMESTAMP,
          assessed_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
          estimated_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
          year_built INTEGER,
          address JSONB,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          type VARCHAR,
          mortgage_info JSONB,
          tags TEXT[]
        );

        CREATE TABLE IF NOT EXISTS power_dialers (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          member_id VARCHAR(36),
          title VARCHAR NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dialer_contacts (
          id VARCHAR(36) PRIMARY KEY,
          power_dialer_id VARCHAR(36) NOT NULL,
          lead_id VARCHAR(36),
          position INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          status VARCHAR DEFAULT 'PENDING' NOT NULL
        );

        CREATE TABLE IF NOT EXISTS call_histories (
          id VARCHAR(36) PRIMARY KEY,
          dialer_contact_id VARCHAR(36) NOT NULL,
          sid VARCHAR,
          dialer_mode VARCHAR NOT NULL,
          team_member_id VARCHAR(36),
          ai_sdr_avatar_id VARCHAR(36),
          disposition VARCHAR,
          notes TEXT,
          sentiment JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP,
          duration INTEGER DEFAULT 0 NOT NULL,
          power_dialer_id VARCHAR(36) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS call_recordings (
          id VARCHAR(36) PRIMARY KEY,
          call_history_id VARCHAR(36) NOT NULL,
          sid VARCHAR,
          status VARCHAR DEFAULT 'UNKNOWN' NOT NULL,
          duration INTEGER DEFAULT 0 NOT NULL,
          url VARCHAR,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP
        );
      `);

      console.log('✅ Tables created successfully');
    }

    // Create admin user if not exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@nextier.com']
    ).catch(() => ({ rows: [] }));

    if (existingUser.rows.length > 0) {
      console.log('✅ Admin user already exists');
    } else {
      console.log('👤 Creating admin user...');

      const hashedPassword = await argon2.hash('Admin123!');
      const userId = 'user_' + ulid();
      const teamId = 'team_' + ulid();
      const teamMemberId = 'team_member_' + ulid();

      await client.query(
        'INSERT INTO users (id, name, email, password, role, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())',
        [userId, 'Admin User', 'admin@nextier.com', hashedPassword, 'super_admin']
      );

      await client.query(
        'INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [teamId, userId, 'Admin Team', 'admin-team']
      );

      await client.query(
        'INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [teamMemberId, userId, teamId, 'owner', 'approved']
      );

      console.log('✅ Admin user created: admin@nextier.com / Admin123!');
    }

  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

setupDatabase();
