import { InjectDB } from "@/database/decorators";
import { orFail } from "@/database/exceptions";
import { DrizzleClient } from "@/database/types";
import { Injectable, Logger } from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";
import { teamsTable as teams, teamMembersTable as teamMembers } from "@/database/schema-alias";
import { SignalHouseProvisioningService } from "@/app/auth/services/signalhouse-provisioning.service";

export interface CreateTeamInput {
  name: string;
  slug: string;
  ownerId: string;
}

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private signalhouseProvisioning: SignalHouseProvisioningService,
  ) {}

  async findById(idOrSlug: string) {
    const team = await this.db.query.teams
      .findFirst({
        where: (t) => and(or(eq(t.id, idOrSlug), eq(t.slug, idOrSlug))),
      })
      .then(orFail("team"));

    return team;
  }

  async findByUserId(userId: string) {
    const team = await this.db.query.teams.findFirst({
      where: (t) => eq(t.ownerId, userId),
    });

    return team;
  }

  /**
   * Create a new team with SignalHouse SubGroup provisioning
   * Ensures 1:1 mapping between Nextier teams and SignalHouse SubGroups
   */
  async createTeam(input: CreateTeamInput) {
    const teamId = `team_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    // Create team in database
    const [team] = await this.db
      .insert(teams)
      .values({
        id: teamId,
        ownerId: input.ownerId,
        name: input.name,
        slug: input.slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    this.logger.log(`Created team: ${teamId} (${input.name})`);

    // Create SignalHouse SubGroup for this team
    // This ensures proper multi-tenant isolation for white-label clients
    try {
      const subGroupResult = await this.signalhouseProvisioning.createSubGroupForTenant(
        teamId, // Using teamId as tenant identifier for SignalHouse
        input.name,
        input.slug
      );

      if (subGroupResult.success && subGroupResult.subGroupId) {
        // Update team with SignalHouse SubGroup ID
        await this.db
          .update(teams)
          .set({
            signalhouseSubGroupId: subGroupResult.subGroupId,
            updatedAt: new Date(),
          })
          .where(eq(teams.id, teamId));

        this.logger.log(`Created SignalHouse SubGroup ${subGroupResult.subGroupId} for team ${teamId}`);
      } else {
        this.logger.error(`Failed to create SignalHouse SubGroup for team ${teamId}: ${subGroupResult.error}`);
        // Don't fail team creation if SignalHouse fails - log and continue
        // SubGroup can be created later via onboarding service
      }
    } catch (error) {
      this.logger.error(`Error creating SignalHouse SubGroup for team ${teamId}:`, error);
      // Continue with team creation - SignalHouse setup can be retried
    }

    return team;
  }

  /**
   * Add a user as a team member
   */
  async addTeamMember(teamId: string, userId: string, role: string = "MEMBER") {
    const memberId = `tm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const [member] = await this.db
      .insert(teamMembers)
      .values({
        id: memberId,
        teamId,
        userId,
        role,
        status: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    this.logger.log(`Added user ${userId} as ${role} to team ${teamId}`);

    return member;
  }
}
