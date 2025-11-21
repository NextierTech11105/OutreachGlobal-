process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');
const crypto = require('crypto');

// Hash password function
function hashPassword(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hashSync(password, 10);
}

async function createAdminUser() {
  const client = new Client({
    host: 'app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com',
    port: 25060,
    user: 'dev-db-410147',
    password: 'AVNS_riGK2NxJWIPxiBuLRSG',
    database: 'dev-db-410147',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully\n');

    // Generate IDs
    const userId = crypto.randomUUID();
    const teamId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Create admin user credentials
    const email = 'admin@nextier.com';
    const password = 'Admin123!';
    const hashedPassword = hashPassword(password);

    console.log('Checking if user already exists...');
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      console.log('User exists, updating password...');
      await client.query(`
        UPDATE users
        SET password = $1, role = $2, updated_at = $3
        WHERE email = $4
      `, [hashedPassword, 'admin', timestamp, email]);
    } else {
      console.log('Creating new admin user...');
      await client.query(`
        INSERT INTO users (id, email, password, name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, email, hashedPassword, 'Admin User', 'admin', timestamp, timestamp]);
    }

    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    const finalUserId = userResult.rows[0].id;

    console.log('Checking if team exists...');
    const existingTeam = await client.query('SELECT id FROM teams WHERE slug = $1', ['admin-team']);

    if (existingTeam.rows.length === 0) {
      console.log('Creating admin team...');
      await client.query(`
        INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [teamId, finalUserId, 'Admin Team', 'admin-team', timestamp, timestamp]);
    } else {
      console.log('Team already exists');
    }

    console.log('\n✓ Admin user and team created successfully!\n');
    console.log('Login credentials:');
    console.log('==================');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\nLogin URL: https://monkfish-app-mb7h3.ondigitalocean.app');
    console.log('\nYou can now login to your application!');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.detail) console.error('Details:', error.detail);
  } finally {
    await client.end();
  }
}

createAdminUser();
