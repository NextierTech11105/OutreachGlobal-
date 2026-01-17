import { BadRequestException, Injectable } from "@nestjs/common";
import { LoginInput } from "../inputs/login.input";
import { RegisterInput } from "../inputs/register.input";
import { AuthService } from "@/app/auth/services/auth.service";
import { UpdateProfileInput } from "../inputs/profile.input";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient, PostgresTransaction } from "@/database/types";
import {
  usersTable,
  teamsTable,
  teamMembersTable,
} from "@/database/schema-alias";
import { eq } from "drizzle-orm";
import { UserInsert } from "../models/user.model";
import { getDatabaseSession } from "@haorama/drizzle-postgres-extra";
import { hashMake } from "@/common/utils/hash";
import { slugify, TeamMemberRole, TeamMemberStatus } from "@nextier/common";
import { addDays } from "date-fns";
import { MailService } from "@/lib/mail/mail.service";

@Injectable()
export class UserService {
  constructor(
    private authService: AuthService,
    @InjectDB() private db: DrizzleClient,
    private mailService: MailService,
  ) {}

  async login(input: LoginInput) {
    const { user } = await this.authService.attempt(input);
    const { token } = await this.authService.accessToken(user);

    return { user, token };
  }

  async register(input: RegisterInput) {
    // Check if email already exists
    const existing = await this.db.query.users.findFirst({
      where: (t, { eq }) => eq(t.email, input.email.toLowerCase()),
    });

    if (existing) {
      throw new BadRequestException("Email already registered");
    }

    const now = new Date();
    const passwordHash = await hashMake(input.password);
    const teamName = input.companyName || `${input.name}'s Team`;
    const slug =
      slugify(teamName) +
      "-" +
      Math.random().toString(16).slice(2, 8).toLowerCase();

    // Create user
    const [user] = await this.db
      .insert(usersTable)
      .values({
        role: "OWNER",
        name: input.name,
        email: input.email.toLowerCase(),
        password: passwordHash,
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create team
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

    // Create team membership
    await this.db.insert(teamMembersTable).values({
      teamId: team.id,
      userId: user.id,
      role: TeamMemberRole.OWNER,
      status: TeamMemberStatus.APPROVED,
      createdAt: now,
      updatedAt: now,
    });

    // Generate access token
    const { token } = await this.authService.accessToken(user);

    // Send welcome email (fire and forget)
    this.mailService.sendWelcome(user.email, user.name).catch((err) => {
      console.error("[UserService] Failed to send welcome email:", err);
    });

    return { user, team, token };
  }

  create(value: UserInsert, session?: PostgresTransaction) {
    const tx = getDatabaseSession(this.db, session);
    return tx.insert(usersTable).values(value).returning();
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const [user] = await this.db
      .update(usersTable)
      .set(input)
      .where(eq(usersTable.id, userId))
      .returning();

    return { user };
  }

  async oauthLogin(input: {
    email: string;
    provider: string;
    name?: string;
    googleId?: string;
  }) {
    // Find user by email or googleId
    let user = await this.db.query.users.findFirst({
      where: (t, { eq, or }) =>
        input.googleId
          ? or(
              eq(t.email, input.email.toLowerCase()),
              eq(t.googleId, input.googleId),
            )
          : eq(t.email, input.email.toLowerCase()),
    });

    const now = new Date();

    // If user doesn't exist, create them (OAuth registration)
    if (!user) {
      if (!input.name) {
        throw new BadRequestException(
          "Name is required for new user registration",
        );
      }

      const teamName = `${input.name}'s Team`;
      const slug =
        slugify(teamName) +
        "-" +
        Math.random().toString(16).slice(2, 8).toLowerCase();

      // Create user without password (OAuth user)
      [user] = await this.db
        .insert(usersTable)
        .values({
          role: "OWNER",
          name: input.name,
          email: input.email.toLowerCase(),
          googleId: input.googleId,
          emailVerifiedAt: now, // OAuth emails are pre-verified
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Create team
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

      // Create team membership
      await this.db.insert(teamMembersTable).values({
        teamId: team.id,
        userId: user.id,
        role: TeamMemberRole.OWNER,
        status: TeamMemberStatus.APPROVED,
        createdAt: now,
        updatedAt: now,
      });

      const { token } = await this.authService.accessToken(user);

      // Send welcome email (fire and forget)
      this.mailService.sendWelcome(user.email, user.name).catch((err) => {
        console.error("[UserService] Failed to send welcome email:", err);
      });

      return { user, team, token };
    }

    // Update googleId if not set (linking existing account)
    if (input.googleId && !user.googleId) {
      [user] = await this.db
        .update(usersTable)
        .set({ googleId: input.googleId, updatedAt: now })
        .where(eq(usersTable.id, user.id))
        .returning();
    }

    // Find user's team
    const team = await this.db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.ownerId, user.id),
    });

    if (!team) {
      // Check if user is a team member
      const membership = await this.db.query.teamMembers.findFirst({
        where: (t, { eq }) => eq(t.userId, user.id),
        with: { team: true },
      });

      if (!membership?.team) {
        throw new BadRequestException("No team found for user");
      }

      const { token } = await this.authService.accessToken(user);
      return { user, team: membership.team, token };
    }

    // Generate access token
    const { token } = await this.authService.accessToken(user);

    return { user, team, token };
  }
}
