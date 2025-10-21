// Create user with ULID - bypasses Redis
const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulid');
const readline = require('readline');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createUser() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database\n');

    const name = await question('Enter your name: ');
    const email = await question('Enter your email: ');
    const password = await question('Enter your password: ');

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Generate ULIDs
    const userId = ulid();
    const teamId = ulid();
    const teamMemberId = ulid();

    // Create user
    await client.query(
      'INSERT INTO users (id, name, email, password, role, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())',
      [userId, name, email, hashedPassword, 'OWNER']
    );
    console.log('✅ User created with ID:', userId);

    // Create team
    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-team';
    await client.query(
      'INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [teamId, userId, name + "'s Team", slug]
    );
    console.log('✅ Team created with ID:', teamId);

    // Add user to team
    await client.query(
      'INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [teamMemberId, teamId, userId, 'OWNER', 'ACTIVE']
    );
    console.log('✅ Team membership created');

    console.log('\n🎉 User setup complete!');
    console.log('Email:', email);
    console.log('\nYou can now log in at www.nextierglobal.ai');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await client.end();
  }
}

createUser();
