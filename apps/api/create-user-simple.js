// Simple script to create a user with integer IDs
const { Client } = require('pg');
const argon2 = require('argon2');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function createUser() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get user input
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (q) => new Promise((resolve) => readline.question(q, resolve));

    const name = await question('Enter your name: ');
    const email = await question('Enter your email: ');
    const password = await question('Enter your password: ');

    readline.close();

    console.log('\nCreating user...');

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Create user - let database auto-generate ID
    const userResult = await client.query(
      'INSERT INTO users (name, email, password, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW(), NOW()) RETURNING id',
      [name, email, hashedPassword]
    );
    const userId = userResult.rows[0].id;
    console.log('✓ User created with ID:', userId);

    // Create team
    const teamName = `${name}'s Team`;
    const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const teamResult = await client.query(
      'INSERT INTO teams (owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
      [userId, teamName, teamSlug]
    );
    const teamId = teamResult.rows[0].id;
    console.log('✓ Team created with ID:', teamId);

    // Create team member
    await client.query(
      'INSERT INTO team_members (user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [userId, teamId, 'owner', 'approved']
    );
    console.log('✓ Team membership created');

    console.log('\n✅ SUCCESS! You can now log in at www.nextierglobal.ai with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createUser();
