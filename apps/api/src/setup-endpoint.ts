import { Controller, Get } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as argon2 from 'argon2';
import { ulid } from 'ulidx';
import * as schema from './database/schema';
import { InjectDB } from './database/decorators';

@Controller('setup')
export class SetupController {
  constructor(
    @InjectDB() private db: PostgresJsDatabase<typeof schema>,
  ) {}

  @Get('create-admin')
  async createAdmin() {
    try {
      // Check if user exists
      const existing = await this.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, 'admin@nextierglobal.ai'),
      });

      if (existing) {
        return { success: true, message: 'Admin user already exists' };
      }

      const hashedPassword = await argon2.hash('Admin123!');
      const userId = ulid();
      const teamId = ulid();
      const memberId = ulid();

      // Create user
      await this.db.insert(schema.users).values({
        id: userId,
        name: 'Admin',
        email: 'admin@nextierglobal.ai',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create team
      await this.db.insert(schema.teams).values({
        id: teamId,
        ownerId: userId,
        name: 'Admin Team',
        slug: 'admin-team',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create team member
      await this.db.insert(schema.teamMembers).values({
        id: memberId,
        userId: userId,
        teamId: teamId,
        role: 'owner',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'Admin user created! Login: admin@nextierglobal.ai / Admin123!',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
