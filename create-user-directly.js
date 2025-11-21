const { Client } = require('pg');

const DATABASE_URL = 'postgresql://dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG@app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com:25060/dev-db-410147?sslmode=require';

async function createUser() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✓ Connected');

    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));

    // Check if user exists
    const users = await client.query('SELECT * FROM users');
    console.log('Users:', users.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createUser();
