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

@Global()
@Module({
  imports: [
    DrizzleModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get("DATABASE_URL");
        const isProduction = configService.get("NODE_ENV") === "production" || configService.get("APP_ENV") === "production";

        // Always use SSL with self-signed certificate acceptance for DigitalOcean
        dbPool = new Pool({
          connectionString: dbUrl,
          ssl: dbUrl?.includes('sslmode=require') || isProduction ? {
            rejectUnauthorized: false,
            // Accept any certificate
            checkServerIdentity: () => undefined,
          } : false,
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
    const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
    if (!isProduction) return;

    console.log('🔄 Creating admin user if not exists...');

    // Create a fresh connection - don't rely on module-level variable
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('⚠️ No DATABASE_URL, skipping admin user creation');
      return;
    }

    const client = new Client({
      connectionString: dbUrl,
      ssl: dbUrl.includes('sslmode=require') ? {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
      } : false,
    });

    try {
      await client.connect();
      console.log('✓ Connected to database for admin setup');

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
