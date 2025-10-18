import { Global, Module } from "@nestjs/common";
import { DrizzleModule } from "@haorama/drizzle-postgres-nestjs";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { DatabaseService } from "./services/database.service";

@Global()
@Module({
  imports: [
    DrizzleModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.get("DATABASE_URL"),
        });

        return {
          client: drizzle({
            client: pool,
            casing: "snake_case",
            schema,
          }),
        };
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
