import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { teamMembersTable, teamsTable, usersTable } from "@/database/schema-alias";
import { TeamMemberRole, TeamMemberStatus, slugify } from "@nextier/common";
import { ConfigService } from "@nestjs/config";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { hashMake } from "@/common/utils/hash";
import { and, eq } from "drizzle-orm";
import * as crypto from "crypto";

export interface OwnerContext {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  team: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

@Injectable()
export class OwnerRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(OwnerRecoveryService.name);

  constructor(
    @InjectDB() private readonly db: DrizzleClient,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureOwnerAnchor("startup");
    } catch (error) {
      this.logger.error(`Failed to ensure owner anchor on startup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async ensureOwnerAnchor(reason: string = "runtime"): Promise<OwnerContext | null> {
    const ownerEmail = this.configService.get<string>("OWNER_EMAIL")?.trim();
    const recoveryToken = this.configService.get<string>("OWNER_RECOVERY_TOKEN");

    if (!ownerEmail || !recoveryToken) {
      this.logger.log("Owner recovery inactive (OWNER_EMAIL or OWNER_RECOVERY_TOKEN missing)");
      return null;
    }

    // Ensure user exists
    let user = await this.db.query.users.findFirst({
      where: (t, { eq }) => eq(t.email, ownerEmail),
    });

    if (!user) {
      const password = await hashMake(`disabled-${Date.now()}-${Math.random()}`);
      const now = new Date();
      [user] = await this.db
        .insert(usersTable)
        .values({
          email: ownerEmail,
          name: ownerEmail.split("@")[0] || "Owner",
          role: "OWNER",
          password,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      this.logger.log(`Owner anchor created user for ${ownerEmail} (${reason})`);
    } else if (user.role !== "OWNER") {
      [user] = await this.db
        .update(usersTable)
        .set({ role: "OWNER", updatedAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();
      this.logger.log(`Owner anchor restored OWNER role for ${ownerEmail} (${reason})`);
    }

    // Ensure team exists and ownership
    let team = await this.db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.ownerId, user.id),
    });

    if (!team) {
      const slugBase = slugify("owner-team");
      const slug = `${slugBase}-${Math.random().toString(16).slice(2, 8)}`;
      const now = new Date();
      [team] = await this.db
        .insert(teamsTable)
        .values({
          ownerId: user.id,
          name: "Owner Team",
          slug,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      this.logger.log(`Owner anchor created team for ${ownerEmail} (${reason})`);
    }

    const member = await this.db.query.teamMembers.findFirst({
      where: (t) =>
        and(eq(t.teamId, team.id), eq(t.userId, user.id), eq(t.status, TeamMemberStatus.APPROVED)),
    });

    if (!member) {
      const now = new Date();
      await this.db.insert(teamMembersTable).values({
        teamId: team.id,
        userId: user.id,
        role: TeamMemberRole.OWNER,
        status: TeamMemberStatus.APPROVED,
        createdAt: now,
        updatedAt: now,
      });
      this.logger.log(`Owner anchor attached owner to team (${reason})`);
    } else if (member.role !== TeamMemberRole.OWNER) {
      await this.db
        .update(teamMembersTable)
        .set({ role: TeamMemberRole.OWNER, updatedAt: new Date() })
        .where(eq(teamMembersTable.id, member.id));
      this.logger.log(`Owner anchor restored team OWNER role (${reason})`);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      team: team
        ? {
            id: team.id,
            name: team.name,
            slug: team.slug,
          }
        : null,
    };
  }

  constantTimeEquals(a?: string, b?: string) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    return crypto.timingSafeEqual(aBuf, bBuf);
  }
}
