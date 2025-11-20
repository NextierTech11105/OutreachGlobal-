#!/usr/bin/env node
const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulidx');

async function setup() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('✓ Connected');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', ['admin@nextierglobal.ai']).catch(() => ({rows:[]}));
    if (existing.rows.length > 0) {
      console.log('✅ User already exists');
      await client.end();
      return;
    }

    const hash = await argon2.hash('Admin123!');
    const uid = ulid();
    const tid = ulid();
    const mid = ulid();

    await client.query('INSERT INTO users (id, name, email, password, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())', [uid, 'Admin', 'admin@nextierglobal.ai', hash]);
    await client.query('INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())', [tid, uid, 'Admin Team', 'admin-team']);
    await client.query('INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())', [mid, uid, tid, 'owner', 'approved']);

    console.log('✅ SUCCESS! Login: admin@nextierglobal.ai / Admin123!');
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setup();
