import { BadRequestException, Injectable } from "@nestjs/common";
import { LoginInput } from "../inputs/login.input";
import { RegisterInput } from "../inputs/register.input";
import { AuthService } from "@/app/auth/services/auth.service";
import { UpdateProfileInput } from "../inputs/profile.input";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient, PostgresTransaction } from "@/database/types";
import { usersTable, teamsTable, teamMembersTable } from "@/database/schema-alias";
import { eq } from "drizzle-orm";
import { UserInsert } from "../models/user.model";
import { getDatabaseSession } from "@haorama/drizzle-postgres-extra";
import { hashMake } from "@/common/utils/hash";
import { slugify, TeamMemberRole, TeamMemberStatus } from "@nextier/common";
import { addDays } from "date-fns";

@Injectable()
export class UserService {
  constructor(
    private authService: AuthService,
    @InjectDB() private db: DrizzleClient,
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

    // Create team with 30-day trial
    const trialEndsAt = addDays(now, 30);
    const [team] = await this.db
      .insert(teamsTable)
      .values({
        ownerId: user.id,
        name: teamName,
        slug,
        trialEndsAt,
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
}
