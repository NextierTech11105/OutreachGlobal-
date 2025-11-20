const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulidx');
const { execSync } = require('child_process');

async function createInitialUser() {
  console.log('🔄 Running database migrations...');
  try {
    execSync('npm run db:push', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Migrations completed');
  } catch (error) {
    console.log('⚠️  Migration warning (may already be applied):', error.message);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@nextierglobal.ai']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Admin user already exists');
      await client.end();
      return;
    }

    const hashedPassword = await argon2.hash('Admin123!');
    const userId = ulid();
    const teamId = ulid();
    const teamMemberId = ulid();

    // Create user
    await client.query(
      'INSERT INTO users (id, name, email, password, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())',
      [userId, 'Admin', 'admin@nextierglobal.ai', hashedPassword]
    );
    console.log('✓ User created');

    // Create team
    await client.query(
      'INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [teamId, userId, 'Admin Team', 'admin-team']
    );
    console.log('✓ Team created');

    // Create team member
    await client.query(
      'INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [teamMemberId, userId, teamId, 'owner', 'approved']
    );
    console.log('✓ Team membership created');

    console.log('\n✅ Initial admin user created: admin@nextierglobal.ai / Admin123!');

  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createInitialUser();
