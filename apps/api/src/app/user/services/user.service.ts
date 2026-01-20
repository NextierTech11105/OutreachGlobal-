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
  subscriptionsTable,
  plansTable,
  creditsTable,
} from "@/database/schema-alias";
import { eq } from "drizzle-orm";
import { UserInsert } from "../models/user.model";
import { getDatabaseSession } from "@haorama/drizzle-postgres-extra";
import { hashMake } from "@/common/utils/hash";
import { slugify, TeamMemberRole, TeamMemberStatus } from "@nextier/common";
import { addDays } from "date-fns";
import { MailService } from "@/lib/mail/mail.service";

const TRIAL_DAYS = 14;

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
      slugify(teamName) + "-" + Math.random().toString(16).slice(2, 8);

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

    // Create trial subscription inline (no service dependency)
    await this.createTrialForTeam(team.id, now);

    const { token } = await this.authService.accessToken(user);

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

    if (!user) {
      if (!input.name) {
        throw new BadRequestException(
          "Name is required for new user registration",
        );
      }

      const teamName = `${input.name}'s Team`;
      const slug =
        slugify(teamName) + "-" + Math.random().toString(16).slice(2, 8);

      [user] = await this.db
        .insert(usersTable)
        .values({
          role: "OWNER",
          name: input.name,
          email: input.email.toLowerCase(),
          googleId: input.googleId,
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

      await this.createTrialForTeam(team.id, now);

      const { token } = await this.authService.accessToken(user);

      this.mailService.sendWelcome(user.email, user.name).catch((err) => {
        console.error("[UserService] Failed to send welcome email:", err);
      });

      return { user, team, token };
    }

    if (input.googleId && !user.googleId) {
      [user] = await this.db
        .update(usersTable)
        .set({ googleId: input.googleId, updatedAt: now })
        .where(eq(usersTable.id, user.id))
        .returning();
    }

    const team = await this.db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.ownerId, user.id),
    });

    if (!team) {
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

    const { token } = await this.authService.accessToken(user);
    return { user, team, token };
  }

  /**
   * Create 14-day trial subscription for a team (inline, no external service)
   */
  private async createTrialForTeam(teamId: string, now: Date) {
    const trialEnd = addDays(now, TRIAL_DAYS);

    // Get or create starter plan
    let plan = await this.db.query.plans.findFirst({
      where: (t, { eq }) => eq(t.slug, "starter"),
    });

    if (!plan) {
      const [newPlan] = await this.db
        .insert(plansTable)
        .values({
          slug: "starter",
          name: "Starter",
          priceMonthly: 9900,
          priceYearly: 99000,
          limits: {
            users: 3,
            leads: 5000,
            searches: 500,
            sms: 1000,
            skipTraces: 100,
            apiAccess: false,
            powerDialer: true,
            whiteLabel: false,
          },
          features: [
            { text: "Up to 5,000 leads", included: true },
            { text: "1,000 SMS/month", included: true },
            { text: "Power Dialer", included: true },
            { text: "3 Team Members", included: true },
          ],
          isActive: true,
          sortOrder: 1,
        })
        .returning();
      plan = newPlan;
    }

    // Create subscription
    await this.db.insert(subscriptionsTable).values({
      teamId,
      planId: plan.id,
      status: "trialing",
      billingCycle: "monthly",
      trialStart: now,
      trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      usageThisPeriod: { leads: 0, searches: 0, sms: 0, skipTraces: 0 },
    });

    // Give trial credits
    await this.db.insert(creditsTable).values({
      teamId,
      creditType: "general",
      balance: 100,
      totalPurchased: 100,
      totalUsed: 0,
      source: "trial",
      expiresAt: trialEnd,
    });

    console.log(
      `[UserService] Created trial for team ${teamId}, expires: ${trialEnd.toISOString()}`,
    );
  }
}
