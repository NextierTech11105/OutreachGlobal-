// Create team for existing user
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createTeam() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    const userId = 6; // The user we just created
    const name = 'Tommy';
    const email = 'tb@outreachglobal.io';

    // First, check if teams table exists, if not create it
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        name VARCHAR NOT NULL,
        slug VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Teams table ready');

    // Create team_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        role VARCHAR NOT NULL,
        status VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Team members table ready');

    // Create team
    const teamName = `${name}'s Team`;
    const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const teamResult = await client.query(
      'INSERT INTO teams (owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
      [userId, teamName, teamSlug]
    );
    const teamId = teamResult.rows[0].id;
    console.log('✓ Team created with ID:', teamId);

    // Create team member
    await client.query(
      'INSERT INTO team_members (user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [userId, teamId, 'owner', 'approved']
    );
    console.log('✓ Team membership created');

    console.log('\n✅ SUCCESS! You can now log in at www.nextierglobal.ai with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: Tradingview#1`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTeam();
