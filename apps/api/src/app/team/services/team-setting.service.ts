import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import {
  TeamSettingInsert,
  TeamSettingSelect,
} from "../models/team-setting.model";
import { teamSettings } from "@/database/schema";
import { eqOrUndefined } from "@haorama/drizzle-postgres-extra";

@Injectable()
export class TeamSettingService {
  constructor(@InjectDB() private db: DrizzleClient) {}

  findByName(teamId: string, name: string) {
    return this.db.query.teamSettings.findFirst({
      where: (t) => and(eq(t.teamId, teamId), eq(t.name, name)),
    });
  }

  mapValues(settings: TeamSettingSelect[]) {
    return settings.reduce(
      (acc, setting) => {
        if (setting.type === "array") {
          acc[setting.name] = setting.value ? JSON.parse(setting.value) : [];
        } else if (setting.type === "boolean") {
          acc[setting.name] = setting.value === "true";
        } else if (setting.type === "number") {
          acc[setting.name] = Number(setting.value);
        } else {
          acc[setting.name] = setting.value ?? null;
        }
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  async getMapped<T extends Record<string, any> = any>(
    teamId: string,
    scope?: string,
  ): Promise<T> {
    const settings = await this.db.query.teamSettings.findMany({
      where: (t) => and(eq(t.teamId, teamId), eqOrUndefined(t.scope, scope)),
    });

    return {
      ...this.mapValues(settings),
      teamId,
    } as unknown as T;
  }

  buildValues(schema: any, input: any) {
    const values: any[] = [];
    const properties = schema.properties as Record<string, any>;

    for (const key of Object.keys(input)) {
      let type = properties[key].type;
      let value = input[key];
      if (!type) {
        const anyOfTypes: any[] = properties[key].anyOf;
        if (anyOfTypes?.length) {
          const correctType = anyOfTypes.find((value) => value.type !== "null");
          type = correctType?.type || "string";
        }
      }

      if (type === "array") {
        value = JSON.stringify(value);
      }

      values.push({
        name: key,
        value,
        type,
      });
    }

    return values;
  }

  async upsert<T extends Record<string, any> = any>(
    teamId: string,
    scope: string,
    values: Omit<TeamSettingInsert, "teamId">[],
  ): Promise<T> {
    if (!values.length) {
      return { teamId } as unknown as T;
    }
    const settings = await this.db
      .insert(teamSettings)
      .values(
        values.map((value) => ({
          ...value,
          scope,
          teamId,
        })),
      )
      .onConflictDoUpdate({
        target: [teamSettings.teamId, teamSettings.name, teamSettings.scope],
        set: {
          value: sql`excluded.value`,
          type: sql`excluded.type`,
        },
      })
      .returning();

    return {
      ...this.mapValues(settings),
      teamId,
    } as unknown as T;
  }
}
