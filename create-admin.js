const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulidx');

const DATABASE_URL = 'postgresql://dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG@app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com:25060/dev-db-410147?sslmode=require';

async function createAdmin() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    const hashedPassword = await argon2.hash('Admin123!');
    const userId = ulid();
    const teamId = ulid();
    const teamMemberId = ulid();

    await client.query(
      'INSERT INTO users (id, name, email, password, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())',
      [userId, 'Admin', 'admin@nextierglobal.ai', hashedPassword]
    );
    console.log('✓ User created');

    await client.query(
      'INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [teamId, userId, 'Admin Team', 'admin-team']
    );
    console.log('✓ Team created');

    await client.query(
      'INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [teamMemberId, userId, teamId, 'owner', 'approved']
    );
    console.log('✓ Team membership created');

    console.log('\n✅ SUCCESS! Login at www.nextierglobal.ai with:');
    console.log('   Email: admin@nextierglobal.ai');
    console.log('   Password: Admin123!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createAdmin();
