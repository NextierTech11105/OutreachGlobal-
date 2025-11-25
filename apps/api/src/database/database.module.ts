import { Global, Module, OnModuleInit } from "@nestjs/common";
import { DrizzleModule } from "@haorama/drizzle-postgres-nestjs";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Pool, Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { DatabaseService } from "./services/database.service";
import * as argon2 from "argon2";
import { ulid } from "ulidx";

let dbPool: Pool | null = null;

// Get SSL config - use CA_CERT if available, otherwise fallback
function getSslConfig(): any {
  let caCert = process.env.CA_CERT;
  if (caCert) {
    // Handle escaped newlines from environment variables
    caCert = caCert.replace(/\\n/g, '\n');
    console.log('📜 Using CA certificate from CA_CERT env var');
    return {
      ca: caCert,
      rejectUnauthorized: true,
    };
  }
  console.log('⚠️ No CA_CERT found, using rejectUnauthorized: false');
  return {
    rejectUnauthorized: false,
  };
}

@Global()
@Module({
  imports: [
    DrizzleModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get("DATABASE_URL");

        const sslConfig = getSslConfig();
        console.log('🔌 Database Pool SSL config:', { hasCaCert: !!sslConfig.ca });

        dbPool = new Pool({
          connectionString: dbUrl,
          ssl: sslConfig,
        });

        return {
          client: drizzle({
            client: dbPool,
            casing: "snake_case",
            schema,
          }),
        };
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnModuleInit {
  async onModuleInit() {
    // ALWAYS run - no production check
    console.log('🔄 DatabaseModule.onModuleInit - Creating admin user if not exists...');
    console.log('ENV:', { NODE_ENV: process.env.NODE_ENV, APP_ENV: process.env.APP_ENV, HAS_DB_URL: !!process.env.DATABASE_URL });

    // Create a fresh connection - don't rely on module-level variable
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('⚠️ No DATABASE_URL, skipping admin user creation');
      return;
    }

    const sslConfig = getSslConfig();
    const client = new Client({
      connectionString: dbUrl,
      ssl: sslConfig,
    });

    try {
      await client.connect();
      console.log('✓ Connected to database for admin setup');

      // First, create tables if they don't exist
      console.log('📦 Creating tables if not exist...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          email_verified_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR(255) PRIMARY KEY,
          owner_id VARCHAR(255) REFERENCES users(id),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS team_members (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id),
          team_id VARCHAR(255) REFERENCES teams(id),
          role VARCHAR(50) DEFAULT 'member',
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✓ Tables ready');

      // Check if admin user exists
      const result = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@nextierglobal.ai']
      );

      if (result.rows.length > 0) {
        console.log('✅ Admin user already exists');
        return;
      }

      console.log('👤 Creating admin user...');
      const hashedPassword = await argon2.hash('Admin123!');
      const userId = 'user_' + ulid();
      const teamId = 'team_' + ulid();
      const teamMemberId = 'team_member_' + ulid();

      await client.query(
        'INSERT INTO users (id, name, email, password, role, email_verified_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())',
        [userId, 'Admin User', 'admin@nextierglobal.ai', hashedPassword, 'super_admin']
      );

      await client.query(
        'INSERT INTO teams (id, owner_id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [teamId, userId, 'Admin Team', 'admin-team']
      );

      await client.query(
        'INSERT INTO team_members (id, user_id, team_id, role, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [teamMemberId, userId, teamId, 'owner', 'approved']
      );

      console.log('✅ Admin user created: admin@nextierglobal.ai / Admin123!');
    } catch (error: any) {
      console.error('⚠️ Admin user creation error:', error?.message || error);
    } finally {
      await client.end();
    }
  }
}
