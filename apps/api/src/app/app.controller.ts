import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { sql } from "drizzle-orm";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  version: string;
  timestamp: string;
  checks: {
    database: { status: "up" | "down"; latencyMs?: number; error?: string };
  };
}

@Controller()
export class AppController {
  constructor(@InjectDB() private db: DrizzleClient) {}

  @Get()
  async getHello() {
    return {
      version: "0.1.0",
    };
  }

  @Get("health")
  async healthCheck(): Promise<HealthStatus> {
    const health: HealthStatus = {
      status: "healthy",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "down" },
      },
    };

    // Check database
    try {
      const start = Date.now();
      await this.db.execute(sql`SELECT 1`);
      health.checks.database = {
        status: "up",
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      health.status = "unhealthy";
      health.checks.database = {
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    if (health.status === "unhealthy") {
      throw new ServiceUnavailableException(health);
    }

    return health;
  }

  @Get("health/live")
  async livenessCheck() {
    return { status: "ok" };
  }

  @Get("health/ready")
  async readinessCheck(): Promise<HealthStatus> {
    return this.healthCheck();
  }
}
