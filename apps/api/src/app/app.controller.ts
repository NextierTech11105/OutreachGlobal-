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
