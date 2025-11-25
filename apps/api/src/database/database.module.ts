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
        const dbUrl = configService.get("DATABASE_URL");
        const isProduction = configService.get("NODE_ENV") === "production" || configService.get("APP_ENV") === "production";

        // Always use SSL with self-signed certificate acceptance for DigitalOcean
        const pool = new Pool({
          connectionString: dbUrl,
          ssl: dbUrl?.includes('sslmode=require') || isProduction ? {
            rejectUnauthorized: false,
            // Accept any certificate
            checkServerIdentity: () => undefined,
          } : false,
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
