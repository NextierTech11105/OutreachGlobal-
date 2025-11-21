process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');
const argon2 = require('argon2');

async function checkUser() {
  const client = new Client({
    host: 'app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com',
    port: 25060,
    user: 'dev-db-410147',
    password: 'AVNS_riGK2NxJWIPxiBuLRSG',
    database: 'dev-db-410147',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    const email = 'admin@nextier.com';
    const password = 'Admin123!';

    // Get user
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      console.log('✗ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('User found:');
    console.log('===========');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Password hash:', user.password);
    console.log('\nHash format:', user.password.substring(0, 20) + '...');

    // Test verification
    console.log('\nTesting password verification...');
    try {
      const isValid = await argon2.verify(user.password, password);
      console.log('Password verification result:', isValid);

      if (isValid) {
        console.log('✓ Password is correct!');
      } else {
        console.log('✗ Password verification failed');

        // Try creating a new hash and testing
        console.log('\nCreating new hash...');
        const newHash = await argon2.hash(password);
        console.log('New hash:', newHash);

        const newVerify = await argon2.verify(newHash, password);
        console.log('New hash verification:', newVerify);
      }
    } catch (err) {
      console.log('✗ Verification error:', err.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUser();
