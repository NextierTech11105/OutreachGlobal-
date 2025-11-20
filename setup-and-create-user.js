// Script to run migrations and create a user
const { execSync } = require('child_process');
const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulidx');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function setup() {
  console.log('Step 1: Running database migrations...');
  try {
    execSync('cd apps/api && npm run db:push', { stdio: 'inherit' });
    console.log('✓ Migrations complete\n');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  console.log('Step 2: Creating admin user...');
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    const name = 'Admin';
    const email = 'admin@nextierglobal.ai';
    const password = 'Admin123!';

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Generate IDs
    const userId = ulid();
    const teamId = ulid();
    const teamMemberId = ulid();

    // Create user
    await client.query(
      'INSERT INTO users (id, name, email, password, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())',
      [userId, name, email, hashedPassword]
    );
    console.log('✓ User created');

    // Create team
    const teamName = `${name}'s Team`;
    const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    await client.query(
      'INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [teamId, userId, teamName, teamSlug]
    );
    console.log('✓ Team created');

    // Create team member
    await client.query(
      'INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [teamMemberId, userId, teamId, 'owner', 'approved']
    );
    console.log('✓ Team membership created');

    console.log('\n✅ SETUP COMPLETE! You can now log in at www.nextierglobal.ai with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup();
