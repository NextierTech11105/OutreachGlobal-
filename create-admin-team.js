// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');

// Simple ULID generator
function ulid() {
  const timestamp = Date.now();
  const randomness = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return timestamp.toString(36).toUpperCase() + randomness.toUpperCase().padEnd(16, '0').substring(0, 16);
}

async function createAdminTeam() {
  const client = new Client({
    connectionString: 'postgresql://dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG@app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com:25060/dev-db-410147?sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if admin user exists
    const userResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      ['admin@nextier.com']
    );

    if (userResult.rows.length === 0) {
      console.error('Admin user not found!');
      return;
    }

    const adminUser = userResult.rows[0];
    console.log('Found admin user:', adminUser);

    // Check if admin already has a team
    const existingTeam = await client.query(
      'SELECT * FROM teams WHERE owner_id = $1',
      [adminUser.id]
    );

    if (existingTeam.rows.length > 0) {
      console.log('Admin already has a team:', existingTeam.rows[0]);
      return;
    }

    // Create team for admin
    const teamId = ulid();
    const now = new Date();

    await client.query(
      `INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, adminUser.id, 'Admin Team', 'admin-team', now, now]
    );

    console.log('Created team with ID:', teamId);

    // Create team member record
    const memberId = ulid();
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [memberId, teamId, adminUser.id, 'OWNER', 'APPROVED', now, now]
    );

    console.log('Created team member record');

    // Verify the team was created
    const verifyTeam = await client.query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );

    console.log('\n✅ SUCCESS! Admin team created:');
    console.log(verifyTeam.rows[0]);
    console.log('\nYou can now access the dashboard at: /t/admin-team');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createAdminTeam();
