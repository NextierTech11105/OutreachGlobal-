process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');
const fs = require('fs');

async function restoreDatabase() {
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
    console.log('Connected successfully');

    console.log('Reading dump file...');
    const dumpPath = 'c:\\Users\\colep\\OutreachGlobal-\\nextierDatadump.txt';
    const sqlContent = fs.readFileSync(dumpPath, 'utf8');

    console.log(`Dump file size: ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB`);
    console.log('Executing SQL commands (this may take several minutes)...');

    // Execute the entire dump
    await client.query(sqlContent);

    console.log('Database restored successfully!');
  } catch (error) {
    console.error('Error restoring database:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

restoreDatabase();
