// Migration script for AI usage tracking tables
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create ai_usage_tracking table
    console.log('Creating ai_usage_tracking table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id TEXT NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        request_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd DECIMAL(12, 6) DEFAULT 0,
        avg_latency_ms INTEGER,
        p95_latency_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(team_id, period_start, provider, model)
      );
    `);
    console.log('✓ ai_usage_tracking table created');

    // Create indexes for ai_usage_tracking
    console.log('Creating indexes for ai_usage_tracking...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS ai_usage_team_period_provider_idx
      ON ai_usage_tracking(team_id, period_start, provider, model);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS ai_usage_period_idx
      ON ai_usage_tracking(period_start);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS ai_usage_team_idx
      ON ai_usage_tracking(team_id);
    `);
    console.log('✓ ai_usage_tracking indexes created');

    // Create ai_usage_limits table
    console.log('Creating ai_usage_limits table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id TEXT NOT NULL UNIQUE,
        monthly_token_limit INTEGER,
        monthly_request_limit INTEGER,
        monthly_cost_limit_usd DECIMAL(10, 2),
        daily_token_limit INTEGER,
        daily_request_limit INTEGER,
        alert_threshold_percent INTEGER DEFAULT 80,
        hard_limit_percent INTEGER DEFAULT 100,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        last_alert_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✓ ai_usage_limits table created');

    // Create indexes for ai_usage_limits
    console.log('Creating indexes for ai_usage_limits...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS ai_usage_limits_team_idx
      ON ai_usage_limits(team_id);
    `);
    console.log('✓ ai_usage_limits indexes created');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

migrate();
