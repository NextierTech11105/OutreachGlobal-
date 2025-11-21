process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');
const argon2 = require('argon2');

async function fixAdminPassword() {
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

    const email = 'admin@nextier.com';
    const password = 'Admin123!';

    console.log('Hashing password with Argon2...');
    const hashedPassword = await argon2.hash(password);
    console.log('Hash created:', hashedPassword.substring(0, 50) + '...\n');

    console.log('Updating admin user password...');
    const result = await client.query(`
      UPDATE users
      SET password = $1, role = $2, updated_at = $3
      WHERE email = $4
      RETURNING id, email, name, role
    `, [hashedPassword, 'admin', new Date().toISOString(), email]);

    if (result.rows.length > 0) {
      console.log('✓ Password updated successfully!\n');
      console.log('User details:');
      console.log('-------------');
      console.log('ID:', result.rows[0].id);
      console.log('Email:', result.rows[0].email);
      console.log('Name:', result.rows[0].name);
      console.log('Role:', result.rows[0].role);
      console.log('\nLogin credentials:');
      console.log('==================');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('\nLogin URL: https://monkfish-app-mb7h3.ondigitalocean.app');
    } else {
      console.log('✗ User not found');
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAdminPassword();
