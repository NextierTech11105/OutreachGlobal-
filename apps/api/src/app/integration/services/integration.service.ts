import { TeamService } from "@/app/team/services/team.service";
import { InjectDB } from "@/database/decorators";
import { integrationsTable } from "@/database/schema-alias";
import { DrizzleClient } from "@/database/types";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AnyObject } from "@nextier/common";
import { AxiosError } from "axios";
import { addSeconds } from "date-fns";
import { and, eq, or, sql } from "drizzle-orm";
import { FindOneIntegrationArgs } from "../args/integration.args";
import { orFail } from "@/database/exceptions";
import { ZohoService } from "./zoho.service";

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
    private teamService: TeamService,
    private zohoService: ZohoService,
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

  connect(teamId: string) {
    return this.zohoService.connect(teamId);
  }

  async authorize(teamId: string, options: AnyObject) {
    const team = await this.teamService.findById(teamId);

    try {
      const data = await this.zohoService.generateToken(options);

      await this.db
        .insert(integrationsTable)
        .values({
          teamId: team.id,
          name: "zoho",
          enabled: true,
          authData: data,
          tokenExpiresAt: addSeconds(new Date(), data.expires_in),
        })
        .onConflictDoUpdate({
          target: [integrationsTable.name, integrationsTable.teamId],
          set: {
            authData: sql`excluded.auth_data`,
            tokenExpiresAt: sql`excluded.token_expires_at`,
          },
        });

      return {
        uri:
          this.configService.get("FRONTEND_URL") +
          `/t/${team.slug}/integrations/crm`,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Zoho authorization error: ${JSON.stringify(error.response?.data)}`,
        );
      }
      throw error;
    }
  }
}
