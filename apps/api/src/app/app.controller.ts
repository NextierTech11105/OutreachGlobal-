import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  teamsTable,
  teamMembersTable,
  usersTable,
} from "@/database/schema-alias";
import { eq, sql } from "drizzle-orm";
import { slugify, TeamMemberRole, TeamMemberStatus } from "@nextier/common";
import { AdminGuard } from "./auth/guards";

@Controller()
export class AppController {
  constructor(@InjectDB() private db: DrizzleClient) {}

  @Get()
  async getHello() {
    return {
      version: "0.1.0",
    };
  }

  /**
   * Health check endpoint for load balancers and monitoring.
   * Returns 200 if the application is running.
   */
  @Get("health")
  async healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      uptime: process.uptime(),
    };
  }

  /**
   * Liveness probe - is the application process alive?
   * Used by Kubernetes/container orchestrators.
   */
  @Get("health/live")
  async livenessProbe() {
    return { status: "alive" };
  }

  /**
   * Readiness probe - is the application ready to serve traffic?
   * Checks database connectivity.
   */
  @Get("health/ready")
  async readinessProbe() {
    try {
      // Test database connection
      await this.db.execute(sql`SELECT 1`);
      return {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: "not_ready",
        database: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // INTERNAL API - Admin only, requires X-Admin-Key header
  @Post("migrate")
  @UseGuards(AdminGuard)
  async runMigrations() {
    const results: string[] = [];

    // Add branding column to teams if it doesn't exist
    try {
      await this.db.execute(sql`
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS branding JSONB
      `);
      results.push("Added branding column to teams");
    } catch (e: any) {
      results.push(`branding column: ${e.message}`);
    }

    // Add description column to teams if it doesn't exist
    try {
      await this.db.execute(sql`
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT
      `);
      results.push("Added description column to teams");
    } catch (e: any) {
      results.push(`description column: ${e.message}`);
    }

    // Create api_keys table if it doesn't exist
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(36) PRIMARY KEY,
          key_hash VARCHAR(128) NOT NULL,
          key_prefix VARCHAR(16) NOT NULL,
          type VARCHAR(20) NOT NULL DEFAULT 'USER',
          team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
          name VARCHAR(100) NOT NULL,
          description VARCHAR(500),
          permissions JSONB,
          rate_limit VARCHAR(20) DEFAULT '1000/hour',
          is_active BOOLEAN NOT NULL DEFAULT true,
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP
        )
      `);
      results.push("Created api_keys table");
    } catch (e: any) {
      results.push(`api_keys table: ${e.message}`);
    }

    // Create indexes for api_keys
    try {
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_api_keys_team_id ON api_keys(team_id)
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active)
      `);
      results.push("Created api_keys indexes");
    } catch (e: any) {
      results.push(`api_keys indexes: ${e.message}`);
    }

    return { success: true, results };
  }

  // INTERNAL API - Admin only, requires X-Admin-Key header
  @Post("setupdb")
  @UseGuards(AdminGuard)
  async setupAdmin() {
    const email =
      process.env.DEFAULT_ADMIN_EMAIL?.trim() || "admin@outreachglobal.io";

    // Find the user
    const user = await this.db.query.users.findFirst({
      where: (t, { eq }) => eq(t.email, email),
    });

    if (!user) {
      return { error: "User not found", email };
    }

    // Check if user has a team
    const existingTeam = await this.db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.ownerId, user.id),
    });

    if (existingTeam) {
      return { message: "Team already exists", team: existingTeam };
    }

    // Create team
    const now = new Date();
    const teamName = `${user.name || "Admin"}'s Team`;
    const slug =
      slugify(teamName) +
      "-" +
      Math.random().toString(16).slice(2, 8).toLowerCase();

    const [team] = await this.db
      .insert(teamsTable)
      .values({
        ownerId: user.id,
        name: teamName,
        slug,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.db.insert(teamMembersTable).values({
      teamId: team.id,
      userId: user.id,
      role: TeamMemberRole.OWNER,
      status: TeamMemberStatus.APPROVED,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, team };
  }
}
