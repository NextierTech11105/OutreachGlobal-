import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { Cron, CronExpression } from "@nestjs/schedule";
import { and, eq, lt, sql } from "drizzle-orm";
import { IntegrationInsert } from "../models/integration.model";
import { addSeconds } from "date-fns";
import { integrationsTable } from "@/database/schema-alias";
import { AxiosError } from "axios";
import { ZohoService } from "../services/zoho.service";

@Injectable()
export class IntegrationSchedule {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private zohoService: ZohoService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkExpires() {
    const integrations = await this.db.query.integrations.findMany({
      where: (t) =>
        and(
          eq(t.enabled, true),
          lt(t.tokenExpiresAt, new Date()),
          eq(t.name, "zoho"),
        ),
    });

    if (integrations.length) {
      console.log("found expired integrations", integrations.length);
      const values: IntegrationInsert[] = [];
      for (const integration of integrations) {
        if (integration.authData?.refresh_token) {
          const refreshToken = integration.authData.refresh_token;
          try {
            const data =
              await this.zohoService.generateRefreshToken(refreshToken);

            values.push({
              name: "zoho",
              teamId: integration.teamId,
              authData: {
                ...data,
                refresh_token: refreshToken,
              },
              tokenExpiresAt: addSeconds(new Date(), data.expires_in),
              enabled: true,
            });
          } catch (error) {
            if (error instanceof AxiosError) {
              console.log(
                "error when refreshing zoho token",
                error.response?.data,
              );
            }
          }
        }
      }

      if (values.length) {
        await this.db
          .insert(integrationsTable)
          .values(values)
          .onConflictDoUpdate({
            target: [integrationsTable.name, integrationsTable.teamId],
            set: {
              authData: sql`excluded.auth_data`,
              tokenExpiresAt: sql`excluded.token_expires_at`,
            },
          });
      }
    }
  }
}
