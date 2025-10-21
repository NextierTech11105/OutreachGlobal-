// Drop all tables to start fresh
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function dropTables() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all tables
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    if (result.rows.length === 0) {
      console.log('No tables to drop');
      return;
    }

    console.log(`Found ${result.rows.length} tables to drop:`);
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));

    // Drop all tables with CASCADE
    console.log('\nDropping all tables...');
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO neondb_owner;
      GRANT ALL ON SCHEMA public TO public;
    `);

    console.log('✅ All tables dropped successfully!');
    console.log('\nNow run: pnpm run db:migrate');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

dropTables();
