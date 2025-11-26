const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulidx');

async function createInitialUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    } : false,
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['Admin@nextier.com']
    ).catch(() => ({ rows: [] }));

    if (existingUser.rows.length > 0) {
      console.log('✅ Admin user already exists');
      await client.end();
      return;
    }

    const hashedPassword = await argon2.hash('Admin123!');
    const userId = 'user_' + ulid();
    const teamId = 'team_' + ulid();
    const teamMemberId = 'team_member_' + ulid();

    // Create user
    await client.query(
      'INSERT INTO users (id, name, email, password, role, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())',
      [userId, 'Admin User', 'Admin@nextier.com', hashedPassword, 'super_admin']
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

    console.log('\n✅ Initial admin user created: admin@nextier.com / Admin123!');

  } catch (error) {
    console.error('Error creating user:', error.message);
    console.log('⚠️  Tables may not exist. Skipping user creation.');
  } finally {
    await client.end();
  }
}

createInitialUser();
