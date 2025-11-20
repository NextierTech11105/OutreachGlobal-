const { drizzle } = require('drizzle-orm/node-postgres');
const { Client } = require('pg');
const argon2 = require('argon2');
const { ulid } = require('ulidx');
const { users, teams, teamMembers } = require('./src/database/schema');

async function createInitialUser() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  try {
    // Check if user already exists
    const existing = await db.select().from(users).where(users.email.eq('admin@nextierglobal.ai'));
    if (existing.length > 0) {
      console.log('Admin user already exists');
      await client.end();
      return;
    }

    const hashedPassword = await argon2.hash('Admin123!');
    const userId = ulid();
    const teamId = ulid();
    const teamMemberId = ulid();

    await db.insert(users).values({
      id: userId,
      name: 'Admin',
      email: 'admin@nextierglobal.ai',
      password: hashedPassword,
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(teams).values({
      id: teamId,
      ownerId: userId,
      name: 'Admin Team',
      slug: 'admin-team',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(teamMembers).values({
      id: teamMemberId,
      userId: userId,
      teamId: teamId,
      role: 'owner',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Initial admin user created: admin@nextierglobal.ai / Admin123!');
  } catch (error) {
    console.error('Error creating user:', error.message);
  } finally {
    await client.end();
  }
}

createInitialUser();
