const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG@app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com:25060/dev-db-410147?sslmode=require'
});

async function restore() {
  console.log('Connecting to database...');
  await client.connect();

  console.log('Reading dump file...');
  const sql = fs.readFileSync('c:\\Users\\colep\\OutreachGlobal-\\nextierDatadump.txt', 'utf8');

  console.log('Restoring database... (this may take a minute)');
  await client.query(sql);

  console.log('Database restored successfully!');
  console.log('Now creating admin user...');

  // Create admin user
  const hash = '$argon2id$v=19$m=65536,t=3,p=4$Umt5WJJ1nyhC1PFE9a3kPQ$TmXkwMMAKYfrlwL8ZzXpfc+EthdKoSOJY3K613ovLR4';

  await client.query(`
    INSERT INTO users (id, name, email, password, email_verified_at, created_at, updated_at)
    VALUES ('01JCZM00000000000000000000', 'Admin', 'admin@nextierglobal.ai', $1, NOW(), NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
  `, [hash]);

  await client.query(`
    INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at)
    VALUES ('01JCZM00000000000000000001', '01JCZM00000000000000000000', 'Admin Team', 'admin-team', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await client.query(`
    INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at)
    VALUES ('01JCZM00000000000000000002', '01JCZM00000000000000000000', '01JCZM00000000000000000001', 'owner', 'approved', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  console.log('✓ Admin user created!');
  console.log('Login at www.nextierglobal.ai with:');
  console.log('  Email: admin@nextierglobal.ai');
  console.log('  Password: Admin123!');

  await client.end();
}

restore().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
