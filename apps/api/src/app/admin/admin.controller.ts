import { Controller, Get, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { sql } from "drizzle-orm";
import Redis from "ioredis";

/**
 * Emergency Admin Dashboard Controller
 * Provides diagnostic and recovery endpoints for production emergencies
 */
@Controller("admin")
export class AdminController {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private configService: ConfigService,
  ) {}

  /**
   * Health Check Endpoint
   * GET /admin/health
   * Returns status of all critical services
   */
  @Get("health")
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      services: {} as Record<string, any>,
      errors: [] as any[],
    };

    // 1. Database Connection Test
    try {
      const dbResult = await this.db.execute(sql`SELECT NOW() as time`);
      results.services.database = {
        status: "✅ Connected",
        serverTime: dbResult.rows[0]?.time,
        url: this.configService.get("DATABASE_URL")?.replace(/:[^:@]+@/, ":***@"),
      };
    } catch (error: any) {
      results.services.database = {
        status: "❌ Failed",
        error: error.message,
      };
      results.errors.push({
        service: "database",
        error: error.message,
        stack: error.stack,
      });
    }

    // 2. DigitalOcean Spaces Connection Test
    try {
      const spacesKey = this.configService.get("DO_SPACES_KEY") || this.configService.get("SPACES_KEY");
      const spacesSecret = this.configService.get("DO_SPACES_SECRET") || this.configService.get("SPACES_SECRET");
      const spacesEndpoint = this.configService.get("DO_SPACES_ENDPOINT") || this.configService.get("SPACES_ENDPOINT") || "https://nyc3.digitaloceanspaces.com";
      const spacesRegion = this.configService.get("DO_SPACES_REGION") || this.configService.get("SPACES_REGION") || "nyc3";

      if (!spacesKey || !spacesSecret) {
        results.services.spaces = {
          status: "⚠️ Not Configured",
          message: "Missing DO_SPACES_KEY or DO_SPACES_SECRET",
          config: {
            endpoint: spacesEndpoint,
            region: spacesRegion,
            keySet: !!spacesKey,
            secretSet: !!spacesSecret,
          },
        };
      } else {
        const s3Client = new S3Client({
          endpoint: spacesEndpoint,
          region: spacesRegion,
          credentials: {
            accessKeyId: spacesKey,
            secretAccessKey: spacesSecret,
          },
        });

        await s3Client.send(new ListBucketsCommand({}));
        
        results.services.spaces = {
          status: "✅ Connected",
          endpoint: spacesEndpoint,
          region: spacesRegion,
          keyPrefix: spacesKey.substring(0, 8) + "...",
        };
      }
    } catch (error: any) {
      results.services.spaces = {
        status: "❌ Failed",
        error: error.message,
        code: error.Code || error.code,
        endpoint: this.configService.get("DO_SPACES_ENDPOINT") || this.configService.get("SPACES_ENDPOINT"),
      };
      results.errors.push({
        service: "spaces",
        error: error.message,
        code: error.Code || error.code,
        name: error.name,
      });
    }

    // 3. Redis Connection Test
    try {
      const redisUrl = this.configService.get("REDIS_URL");
      
      if (!redisUrl) {
        results.services.redis = {
          status: "⚠️ Not Configured",
          message: "Missing REDIS_URL",
        };
      } else {
        const redis = new Redis(redisUrl);
        const pong = await redis.ping();
        await redis.quit();
        
        results.services.redis = {
          status: "✅ Connected",
          response: pong,
          url: redisUrl.replace(/:[^:@]+@/, ":***@"),
        };
      }
    } catch (error: any) {
      results.services.redis = {
        status: "❌ Failed",
        error: error.message,
      };
      results.errors.push({
        service: "redis",
        error: error.message,
      });
    }

    // 4. Get recent errors from database (if we can connect)
    if (results.services.database?.status === "✅ Connected") {
      try {
        // Try to get logs from a logs table if it exists
        const logsQuery = await this.db.execute(sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('error_logs', 'system_logs', 'logs')
          LIMIT 1
        `);

        if (logsQuery.rows.length > 0) {
          const tableName = logsQuery.rows[0].table_name as string;
          
          // Validate table name against whitelist to prevent SQL injection
          const allowedTables = ['error_logs', 'system_logs', 'logs'];
          if (!allowedTables.includes(tableName)) {
            results.services.logs = {
              status: "⚠️ Invalid table name",
              error: "Table name not in allowed list",
            };
          } else {
            // Safe to use since we validated against whitelist
            const logs = await this.db.execute(
              sql.raw(`
                SELECT * FROM "${tableName}"
                ORDER BY created_at DESC
                LIMIT 10
              `)
            );
            results.services.logs = {
              status: "✅ Available",
              count: logs.rows.length,
              recent: logs.rows,
            };
          }
        } else {
          results.services.logs = {
            status: "⚠️ No log table found",
            message: "No error_logs, system_logs, or logs table exists",
          };
        }
      } catch (error: any) {
        results.services.logs = {
          status: "⚠️ Could not retrieve",
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * System Status Endpoint
   * GET /admin/status
   * Returns overall system status and configuration
   */
  @Get("status")
  async systemStatus() {
    const status = {
      app: {
        version: "1.0.0",
        environment: this.configService.get("NODE_ENV") || "development",
        mode: this.configService.get("APP_MODE") || "web",
      },
      database: {
        configured: !!this.configService.get("DATABASE_URL"),
      } as Record<string, any>,
      services: {} as Record<string, any>,
      missingEnvVars: [] as string[],
    };

    // Check database schema version
    try {
      const result = await this.db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      status.database = {
        ...status.database,
        status: "✅ Connected",
        tableCount: result.rows.length,
        tables: result.rows.map((r: any) => r.table_name),
      };

      // Check for migrations table
      const migrationsResult = await this.db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      `);

      if (migrationsResult.rows.length > 0) {
        const migrations = await this.db.execute(sql`
          SELECT * FROM __drizzle_migrations 
          ORDER BY created_at DESC
        `);
        status.database = {
          ...status.database,
          migrations: {
            total: migrations.rows.length,
            latest: migrations.rows[0],
          },
        };
      }
    } catch (error: any) {
      status.database = {
        ...status.database,
        status: "❌ Error",
        error: error.message,
      };
    }

    // Check critical environment variables
    const criticalEnvVars = [
      "DATABASE_URL",
      "REDIS_URL",
      "DO_SPACES_KEY",
      "DO_SPACES_SECRET",
      "JWT_SECRET",
      "SIGNALHOUSE_API_KEY",
    ];

    const envVarStatus = {} as Record<string, string>;
    
    for (const envVar of criticalEnvVars) {
      const value = this.configService.get(envVar);
      if (!value) {
        envVarStatus[envVar] = "❌ Missing";
        status.missingEnvVars.push(envVar);
      } else if (value.length < 10) {
        envVarStatus[envVar] = "⚠️ Too Short";
      } else {
        envVarStatus[envVar] = "✅ Set";
      }
    }

    status.services.environmentVariables = envVarStatus;

    return status;
  }

  /**
   * Spaces Fix Endpoint
   * POST /admin/fix-spaces
   * Tests Spaces credentials and provides fix instructions
   */
  @Post("fix-spaces")
  async fixSpaces() {
    const result = {
      timestamp: new Date().toISOString(),
      currentConfig: {} as any,
      test: {} as any,
      instructions: [] as string[],
    };

    // Get current configuration
    const spacesKey = this.configService.get("DO_SPACES_KEY") || this.configService.get("SPACES_KEY");
    const spacesSecret = this.configService.get("DO_SPACES_SECRET") || this.configService.get("SPACES_SECRET");
    const spacesEndpoint = this.configService.get("DO_SPACES_ENDPOINT") || this.configService.get("SPACES_ENDPOINT") || "https://nyc3.digitaloceanspaces.com";
    const spacesRegion = this.configService.get("DO_SPACES_REGION") || this.configService.get("SPACES_REGION") || "nyc3";
    const spacesBucket = this.configService.get("DO_SPACES_BUCKET") || this.configService.get("SPACES_BUCKET") || "nextier";

    result.currentConfig = {
      endpoint: spacesEndpoint,
      region: spacesRegion,
      bucket: spacesBucket,
      keySet: !!spacesKey,
      secretSet: !!spacesSecret,
      keyPrefix: spacesKey ? spacesKey.substring(0, 8) + "..." : "NOT SET",
    };

    // Test the configuration
    if (!spacesKey || !spacesSecret) {
      result.test = {
        status: "❌ Configuration Missing",
        error: "DO_SPACES_KEY and/or DO_SPACES_SECRET not set",
      };

      result.instructions = [
        "🔧 FIX STEPS FOR MISSING SPACES CREDENTIALS:",
        "",
        "1. Generate new Spaces access keys:",
        "   → Go to: https://cloud.digitalocean.com/account/api/spaces",
        "   → Click 'Generate New Key'",
        "   → Name it: 'OutreachGlobal-Production'",
        "   → Save both Key and Secret immediately",
        "",
        "2. Update environment variables in DigitalOcean App:",
        "   → Go to: https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings",
        "   → Click 'Edit' on environment variables",
        "   → Set DO_SPACES_KEY=<your-key>",
        "   → Set DO_SPACES_SECRET=<your-secret>",
        "   → Click 'Save'",
        "",
        "3. Redeploy the application:",
        "   → Click 'Deploy' or run:",
        "   → doctl apps create-deployment c61ce74c-eb13-4eaa-b856-f632849111c9 --force-rebuild",
        "",
        "4. Verify the fix:",
        "   → Call this endpoint again: POST /admin/fix-spaces",
      ];
    } else {
      try {
        const s3Client = new S3Client({
          endpoint: spacesEndpoint,
          region: spacesRegion,
          credentials: {
            accessKeyId: spacesKey,
            secretAccessKey: spacesSecret,
          },
        });

        const bucketsResponse = await s3Client.send(new ListBucketsCommand({}));
        
        result.test = {
          status: "✅ Credentials Valid",
          bucketsFound: bucketsResponse.Buckets?.length || 0,
          bucketNames: bucketsResponse.Buckets?.map(b => b.Name) || [],
        };

        result.instructions = [
          "✅ Spaces credentials are working!",
          "",
          "Your configuration is valid and can connect to DigitalOcean Spaces.",
          `Found ${bucketsResponse.Buckets?.length || 0} bucket(s).`,
        ];
      } catch (error: any) {
        result.test = {
          status: "❌ Credentials Invalid",
          error: error.message,
          errorCode: error.Code || error.code,
          errorName: error.name,
        };

        if (error.message?.includes("SignatureDoesNotMatch")) {
          result.instructions = [
            "🔧 FIX STEPS FOR 'SignatureDoesNotMatch' ERROR:",
            "",
            "This error means your DO_SPACES_SECRET is incorrect or the key has been rotated.",
            "",
            "1. Generate NEW Spaces access keys:",
            "   → Go to: https://cloud.digitalocean.com/account/api/spaces",
            "   → Find and DELETE the old 'OutreachGlobal' key",
            "   → Click 'Generate New Key'",
            "   → Name it: 'OutreachGlobal-Production-2024'",
            "   → Copy BOTH the Key and Secret immediately",
            "",
            "2. Update environment variables in DigitalOcean App:",
            "   → Go to: https://cloud.digitalocean.com/apps/c61ce74c-eb13-4eaa-b856-f632849111c9/settings",
            "   → Click 'Edit' on environment variables",
            "   → Update DO_SPACES_KEY=<new-key>",
            "   → Update DO_SPACES_SECRET=<new-secret>",
            "   → Click 'Save'",
            "",
            "3. Redeploy the application:",
            "   → The app will automatically redeploy after env var changes",
            "   → Or manually trigger: doctl apps create-deployment c61ce74c-eb13-4eaa-b856-f632849111c9",
            "",
            "4. Wait 3-5 minutes for deployment to complete",
            "",
            "5. Verify the fix:",
            "   → Call this endpoint again: POST /admin/fix-spaces",
          ];
        } else {
          result.instructions = [
            "🔧 FIX STEPS FOR SPACES ERROR:",
            "",
            `Error: ${error.message}`,
            `Code: ${error.Code || error.code || "Unknown"}`,
            "",
            "1. Check your Spaces configuration:",
            `   → Endpoint: ${spacesEndpoint}`,
            `   → Region: ${spacesRegion}`,
            `   → Bucket: ${spacesBucket}`,
            "",
            "2. Verify credentials at:",
            "   → https://cloud.digitalocean.com/account/api/spaces",
            "",
            "3. If error persists, generate new keys and update env vars",
          ];
        }
      }
    }

    return result;
  }
}
