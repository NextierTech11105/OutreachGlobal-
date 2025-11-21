// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');

async function checkAdminTeam() {
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
    const userResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      ['admin@nextier.com']
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Admin user not found!');
      return;
    }

    const adminUser = userResult.rows[0];
    console.log('✅ Admin user found:');
    console.log('   ID:', adminUser.id);
    console.log('   Email:', adminUser.email);
    console.log('   Name:', adminUser.name);
    console.log('');

    // Get all teams for admin
    const teamsResult = await client.query(
      'SELECT * FROM teams WHERE owner_id = $1',
      [adminUser.id]
    );

    console.log(`Found ${teamsResult.rows.length} team(s) owned by admin:`);
    teamsResult.rows.forEach(team => {
      console.log('   - Team ID:', team.id);
      console.log('     Name:', team.name);
      console.log('     Slug:', team.slug);
      console.log('');
    });

    // Get team memberships
    const membersResult = await client.query(
      'SELECT tm.*, t.name as team_name, t.slug as team_slug FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE tm.user_id = $1',
      [adminUser.id]
    );

    console.log(`Admin is a member of ${membersResult.rows.length} team(s):`);
    membersResult.rows.forEach(member => {
      console.log('   - Team:', member.team_name, `(${member.team_slug})`);
      console.log('     Role:', member.role);
      console.log('     Status:', member.status);
      console.log('');
    });

    if (teamsResult.rows.length > 0) {
      const firstTeam = teamsResult.rows[0];
      console.log('✅ SUCCESS! You should be able to access:');
      console.log(`   https://monkfish-app-mb7h3.ondigitalocean.app/t/${firstTeam.slug}`);
    } else {
      console.log('❌ Admin has no teams! Need to create one.');
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkAdminTeam();
