import { InjectDB } from "@/database/decorators";
import { leadsTable } from "@/database/schema-alias";
import { DrizzleClient } from "@/database/types";
import { tryRollback } from "@haorama/drizzle-postgres-extra";
import { Injectable, InternalServerErrorException } from "@nestjs/common";

@Injectable()
export class LeadRepository {
  constructor(@InjectDB() private db: DrizzleClient) {}

  async insertMany(values: any[]) {
    const BATCH_SIZE = 5000;

    await this.db.transaction(async (tx) => {
      const leadIds: string[] = [];
      try {
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
          const batch = values.slice(i, i + BATCH_SIZE);
          if (batch.length) {
            await tx.insert(leadsTable).values(batch);
          }
        }

        return { leadIds };
      } catch (error) {
        tryRollback(tx);
        throw new InternalServerErrorException(error);
      }
    });
  }
}
