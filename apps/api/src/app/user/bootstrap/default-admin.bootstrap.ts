import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  teamMembersTable,
  teamsTable,
  usersTable,
} from "@/database/schema-alias";
import { hashMake } from "@/common/utils/hash";
import { slugify, TeamMemberRole, TeamMemberStatus } from "@nextier/common";

/**
 * Creates a default admin user on startup if one does not exist.
 * Triggered only when DEFAULT_ADMIN_PASSWORD is set.
 */
@Injectable()
export class DefaultAdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultAdminBootstrap.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  async onApplicationBootstrap() {
    const email =
      process.env.DEFAULT_ADMIN_EMAIL?.trim() || "admin@example.com";
    const name = process.env.DEFAULT_ADMIN_NAME?.trim() || "Admin";
    const password = process.env.DEFAULT_ADMIN_PASSWORD?.trim();

    // Do nothing unless a password is provided
    if (!password) {
      return;
    }

    const existing = await this.db.query.users.findFirst({
      where: (t, { eq }) => eq(t.email, email),
    });
    if (existing) {
      this.logger.log(`Default admin already exists for ${email}`);
      return;
    }

    const now = new Date();
    const passwordHash = await hashMake(password);
    const teamName = `${name}'s Team`;
    const slug =
      slugify(teamName) +
      "-" +
      Math.random().toString(16).slice(2, 8).toLowerCase();

    const [user] = await this.db
      .insert(usersTable)
      .values({
        role: "OWNER",
        name,
        email,
        password: passwordHash,
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

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

    this.logger.log(
      `Default admin created: ${email} (password set via DEFAULT_ADMIN_PASSWORD)`,
    );
  }
}
