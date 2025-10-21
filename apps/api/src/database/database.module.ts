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
          max: 1, // Serverless: 1 connection per function instance
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
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
