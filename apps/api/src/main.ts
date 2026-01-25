import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";
import { Logger } from "nestjs-pino";
import { sql } from "drizzle-orm";

const PORT = parseInt(process.env.PORT || "3001", 10);

// Auto-run migrations on startup
async function runMigrations(db: any) {
  const results: string[] = [];
  console.log("[Migrations] Running auto-migrations on startup...");

  // LEADS TABLE
  try {
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_id VARCHAR(20)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_status VARCHAR(20) DEFAULT 'raw'`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS primary_phone VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS primary_phone_type VARCHAR(10)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile1 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile2 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile3 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile4 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile5 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS landline1 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS landline2 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS landline3 VARCHAR(15)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email1 VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email2 VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email3 VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email4 VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email5 VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS tracerfy_queue_id INTEGER`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_activity_score SMALLINT`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_contact_grade VARCHAR(1)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_line_type VARCHAR(20)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_name_match BOOLEAN`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_contact_grade VARCHAR(1)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_name_match BOOLEAN`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_tag VARCHAR(20) DEFAULT 'usbizdata'`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS sector_tag VARCHAR(50)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS sic_tag VARCHAR(10)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS sic_description VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS county VARCHAR(50)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS website VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS employees VARCHAR(20)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS annual_sales VARCHAR(30)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS sic_code VARCHAR(10)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(36)`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS sms_ready BOOLEAN DEFAULT false`);
    results.push("leads columns OK");
  } catch (e: any) {
    results.push(`leads: ${e.message}`);
  }

  // BUSINESSES TABLE
  try {
    await db.execute(sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS apollo_matched BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS skip_traced BOOLEAN DEFAULT false`);
    results.push("businesses columns OK");
  } catch (e: any) {
    results.push(`businesses: ${e.message}`);
  }

  // NEW TABLES
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sequence_enrollments (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        lead_id VARCHAR(36) NOT NULL,
        sequence_id VARCHAR(36),
        status VARCHAR(20) DEFAULT 'active',
        current_step INTEGER DEFAULT 0,
        next_step_at TIMESTAMPTZ,
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS next_step_at TIMESTAMPTZ`);
    results.push("sequence_enrollments OK");
  } catch (e: any) {
    results.push(`sequence_enrollments: ${e.message}`);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app_state (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36),
        user_id VARCHAR(36),
        key VARCHAR(255) NOT NULL,
        value JSONB NOT NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS app_state_key_idx ON app_state(key)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS app_state_team_idx ON app_state(team_id)`);
    results.push("app_state OK");
  } catch (e: any) {
    results.push(`app_state: ${e.message}`);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS batch_jobs (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        total INTEGER DEFAULT 0,
        processed INTEGER DEFAULT 0,
        successful INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        config JSONB,
        results JSONB,
        errors JSONB,
        scheduled_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push("batch_jobs OK");
  } catch (e: any) {
    results.push(`batch_jobs: ${e.message}`);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scheduled_content (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        content_type VARCHAR(50),
        channel VARCHAR(50),
        status VARCHAR(20) DEFAULT 'draft',
        publish_date TIMESTAMPTZ,
        target_audience JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push("scheduled_content OK");
  } catch (e: any) {
    results.push(`scheduled_content: ${e.message}`);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS call_queue (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        lead_id VARCHAR(36),
        phone VARCHAR(20),
        priority VARCHAR(10) DEFAULT 'WARM',
        status VARCHAR(20) DEFAULT 'pending',
        source VARCHAR(50),
        notes TEXT,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        called_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push("call_queue OK");
  } catch (e: any) {
    results.push(`call_queue: ${e.message}`);
  }

  // TEAM_SETTINGS TABLE
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_settings (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        value TEXT,
        masked_value TEXT,
        is_masked BOOLEAN DEFAULT false,
        type VARCHAR(50),
        scope VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS team_settings_team_idx ON team_settings(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS team_settings_name_idx ON team_settings(name)`);
    results.push("team_settings OK");
  } catch (e: any) {
    results.push(`team_settings: ${e.message}`);
  }

  // PLANS TABLE
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(36) PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_monthly INTEGER DEFAULT 0,
        price_yearly INTEGER DEFAULT 0,
        setup_fee INTEGER DEFAULT 0,
        limits JSONB,
        features JSONB,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push("plans OK");
  } catch (e: any) {
    results.push(`plans: ${e.message}`);
  }

  console.log("[Migrations] Complete:", results.join(", "));
  return results;
}

const ONE_HUNDRED_MB = 100 * 1024 * 1024;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      disableRequestLogging: true, // Let Pino handle request logging
      bodyLimit: ONE_HUNDRED_MB,
    }),
    {
      rawBody: true,
      bufferLogs: true, // Buffer logs until Pino logger is ready
    },
  );

  // Use Pino for structured JSON logging
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "https://monkfish-app-mb7h3.ondigitalocean.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Set global API prefix for all routes
  app.setGlobalPrefix("api", {
    exclude: ["/", "/graphql", "/version"],
  });

  app.enableShutdownHooks();

  // Run migrations before starting server
  try {
    const { DEFAULT_DB_PROVIDER_NAME } = await import("@haorama/drizzle-postgres-nestjs");
    const db = app.get(DEFAULT_DB_PROVIDER_NAME);
    await runMigrations(db);
  } catch (e: any) {
    console.error("[Migrations] Failed:", e.message);
  }

  await app.listen(PORT, "0.0.0.0");
  return app;
}

bootstrap()
  .then((app) => {
    const logger = app.get(Logger);
    logger.log(`Server running on http://localhost:${PORT}`);
  })
  .catch((err) => {
    // Use console.error here since Logger may not be available
    process.stderr.write(`Application startup failed: ${err.message}\n`);
    process.exit(1);
  });
