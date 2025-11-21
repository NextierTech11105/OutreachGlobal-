const postgres = require('postgres');
const argon2 = require('argon2');
const { ulid } = require('ulidx');

const DATABASE_URL = 'postgresql://dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG@app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com:25060/dev-db-410147?sslmode=require';

const sql = postgres(DATABASE_URL);

async function createAdmin() {
  try {
    // Check if user exists
    const existing = await sql`SELECT * FROM users WHERE email = 'admin@nextierglobal.ai' LIMIT 1`;

    if (existing.length > 0) {
      console.log('✅ Admin user already exists!');
      console.log('Email: admin@nextierglobal.ai');
      console.log('Password: Admin123!');
      await sql.end();
      return;
    }

    const hashedPassword = await argon2.hash('Admin123!');
    const userId = ulid();
    const teamId = ulid();
    const memberId = ulid();
    const now = new Date();

    // Create user
    await sql`
      INSERT INTO users (id, name, email, password, email_verified_at, created_at, updated_at)
      VALUES (${userId}, 'Admin', 'admin@nextierglobal.ai', ${hashedPassword}, ${now}, ${now}, ${now})
    `;

    // Create team
    await sql`
      INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
      VALUES (${teamId}, ${userId}, 'Admin Team', 'admin-team', ${now}, ${now})
    `;

    // Create team member
    await sql`
      INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at)
      VALUES (${memberId}, ${userId}, ${teamId}, 'owner', 'approved', ${now}, ${now})
    `;

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@nextierglobal.ai');
    console.log('Password: Admin123!');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

createAdmin();
