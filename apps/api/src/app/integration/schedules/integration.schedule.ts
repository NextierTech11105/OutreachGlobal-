import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { Cron, CronExpression } from "@nestjs/schedule";
import { and, eq, lt } from "drizzle-orm";

@Injectable()
export class IntegrationSchedule {
  private readonly logger = new Logger(IntegrationSchedule.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkExpires() {
    // Find integrations with expired tokens
    const integrations = await this.db.query.integrations.findMany({
      where: (t) => and(eq(t.enabled, true), lt(t.tokenExpiresAt, new Date())),
    });

    if (integrations.length) {
      this.logger.log(`Found ${integrations.length} expired integrations`);
      // TODO: Add provider-specific token refresh logic here
      // Each provider (Stripe, HubSpot, etc.) will have its own refresh mechanism
      for (const integration of integrations) {
        this.logger.warn(
          `Integration ${integration.id} (${integration.name}) has expired token - refresh not implemented`,
        );
      }
    }
  }
}
