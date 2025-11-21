// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');

// Simple ULID generator
function ulid() {
  const timestamp = Date.now();
  const randomness = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return timestamp.toString(36).toUpperCase() + randomness.toUpperCase().padEnd(16, '0').substring(0, 16);
}

async function fixAdminTeam() {
  const client = new Client({
    connectionString: 'postgresql://dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG@app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com:25060/dev-db-410147?sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get admin user
    const adminResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['admin@nextier.com']
    );

    if (adminResult.rows.length === 0) {
      console.error('❌ Admin user not found!');
      return;
    }

    const adminUser = adminResult.rows[0];
    console.log('Admin user ID:', adminUser.id);

    // Check ALL teams
    const allTeams = await client.query('SELECT * FROM teams');
    console.log(`\n📊 Found ${allTeams.rows.length} total team(s) in database:`);
    allTeams.rows.forEach(team => {
      console.log('  - Team:', team.name, `(${team.slug})`);
      console.log('    Owner ID:', team.owner_id);
      console.log('    Matches admin?', team.owner_id === adminUser.id);
      console.log('');
    });

    // Delete the orphaned admin-team
    console.log('Deleting orphaned team with slug "admin-team"...');
    await client.query('DELETE FROM teams WHERE slug = $1', ['admin-team']);

    // Create team with correct owner
    const teamId = ulid();
    const now = new Date();

    await client.query(
      `INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [teamId, adminUser.id, 'Admin Team', 'admin-team', now, now]
    );

    console.log('✅ Created team with ID:', teamId);

    // Create team member record
    const memberId = ulid();
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [memberId, teamId, adminUser.id, 'OWNER', 'APPROVED', now, now]
    );

    console.log('✅ Created team member record');
    console.log('\n🎉 SUCCESS! You can now access:');
    console.log('   https://monkfish-app-mb7h3.ondigitalocean.app/t/admin-team');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixAdminTeam();
