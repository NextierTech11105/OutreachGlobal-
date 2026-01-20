import { TeamService } from "@/app/team/services/team.service";
import { InjectDB } from "@/database/decorators";
import { integrationsTable } from "@/database/schema-alias";
import { DrizzleClient } from "@/database/types";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AnyObject } from "@nextier/common";
import { and, eq, or, sql } from "drizzle-orm";
import { FindOneIntegrationArgs } from "../args/integration.args";
import { orFail } from "@/database/exceptions";

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
    private teamService: TeamService,
  ) {}

  async findOneOrFail(options: FindOneIntegrationArgs) {
    const integration = await this.db.query.integrations
      .findFirst({
        where: (t) =>
          and(
            eq(t.teamId, options.teamId),
            or(eq(t.name, options.id), eq(t.id, options.id)),
          ),
      })
      .then(orFail("integration"));
    return integration;
  }

  async findByTeam(teamId: string) {
    return this.db.query.integrations.findMany({
      where: (t) => eq(t.teamId, teamId),
    });
  }

  // Generic connect - returns OAuth URL for the provider
  connect(teamId: string, provider: string) {
    this.logger.log(
      `Connect request for provider: ${provider}, team: ${teamId}`,
    );
    // TODO: Add provider-specific OAuth flows here
    throw new Error(`Provider ${provider} not yet implemented`);
  }

  // Generic authorize - handles OAuth callback
  async authorize(teamId: string, provider: string, options: AnyObject) {
    const team = await this.teamService.findById(teamId);
    this.logger.log(
      `Authorize request for provider: ${provider}, team: ${team.id}`,
    );
    // TODO: Add provider-specific token exchange here
    throw new Error(`Provider ${provider} not yet implemented`);
  }

  // Upsert integration record
  async upsertIntegration(
    teamId: string,
    name: string,
    authData: AnyObject,
    expiresIn?: number,
  ) {
    await this.db
      .insert(integrationsTable)
      .values({
        teamId,
        name,
        enabled: true,
        authData,
        tokenExpiresAt: expiresIn
          ? new Date(Date.now() + expiresIn * 1000)
          : null,
      })
      .onConflictDoUpdate({
        target: [integrationsTable.name, integrationsTable.teamId],
        set: {
          authData: sql`excluded.auth_data`,
          tokenExpiresAt: sql`excluded.token_expires_at`,
        },
      });
  }
}
