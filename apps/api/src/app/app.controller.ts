import { Controller, Get } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as argon2 from "argon2";
import { ulid } from "ulidx";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { InjectDB } from "../database/decorators";

@Controller()
export class AppController {
  constructor(
    @InjectDB() private db: PostgresJsDatabase<typeof schema>,
  ) {}

  @Get()
  async getHello() {
    return {
      version: "0.1.0",
    };
  }

  @Get("setup-admin")
  async setupAdmin() {
    try {
      const existing = await this.db.query.users.findFirst({
        where: eq(schema.users.email, "admin@nextierglobal.ai"),
      });

      if (existing) {
        return { success: true, message: "Admin already exists" };
      }

      const hash = await argon2.hash("Admin123!");
      const uid = ulid();
      const tid = ulid();
      const mid = ulid();

      await this.db.insert(schema.users).values({
        id: uid,
        name: "Admin",
        email: "admin@nextierglobal.ai",
        password: hash,
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.db.insert(schema.teams).values({
        id: tid,
        ownerId: uid,
        name: "Admin Team",
        slug: "admin-team",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.db.insert(schema.teamMembers).values({
        id: mid,
        userId: uid,
        teamId: tid,
        role: "owner",
        status: "approved",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, message: "Admin created! Login: admin@nextierglobal.ai / Admin123!" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
