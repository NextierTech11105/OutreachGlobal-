import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  teamsTable,
  teamMembersTable,
  usersTable,
} from "@/database/schema-alias";
import { eq, sql } from "drizzle-orm";
import { slugify, TeamMemberRole, TeamMemberStatus } from "@nextier/common";
import { AdminGuard } from "./auth/guards";

@Controller()
export class AppController {
  constructor(@InjectDB() private db: DrizzleClient) {}

  @Get()
  async getHello() {
    return {
      version: "0.1.0",
    };
  }

  /**
   * Health check endpoint for load balancers and monitoring.
   * Returns 200 if the application is running.
   */
  @Get("health")
  async healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      uptime: process.uptime(),
    };
  }

  /**
   * Liveness probe - is the application process alive?
   * Used by Kubernetes/container orchestrators.
   */
  @Get("health/live")
  async livenessProbe() {
    return { status: "alive" };
  }

  /**
   * Readiness probe - is the application ready to serve traffic?
   * Checks database connectivity.
   */
  @Get("health/ready")
  async readinessProbe() {
    try {
      // Test database connection
      await this.db.execute(sql`SELECT 1`);
      return {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: "not_ready",
        database: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // INTERNAL API - Admin only, requires X-Admin-Key header
  @Post("migrate")
  @UseGuards(AdminGuard)
  async runMigrations() {
    const results: string[] = [];

    // ═══════════════════════════════════════════════════════════════════════
    // LEADS TABLE - Add all missing LUCI enrichment columns
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_id VARCHAR(20)
      `);
      results.push("Added lead_id column to leads");
    } catch (e: any) {
      results.push(`leads lead_id: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_status VARCHAR(20) DEFAULT 'raw'
      `);
      results.push("Added enrichment_status column to leads");
    } catch (e: any) {
      results.push(`leads enrichment_status: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ
      `);
      results.push("Added ready_at column to leads");
    } catch (e: any) {
      results.push(`leads ready_at: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS primary_phone VARCHAR(15)
      `);
      results.push("Added primary_phone column to leads");
    } catch (e: any) {
      results.push(`leads primary_phone: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS primary_phone_type VARCHAR(10)
      `);
      results.push("Added primary_phone_type column to leads");
    } catch (e: any) {
      results.push(`leads primary_phone_type: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile1 VARCHAR(15)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile2 VARCHAR(15)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile3 VARCHAR(15)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile4 VARCHAR(15)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile5 VARCHAR(15)
      `);
      results.push("Added mobile1-5 columns to leads");
    } catch (e: any) {
      results.push(`leads mobile columns: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS landline1 VARCHAR(15)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS landline2 VARCHAR(15)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS landline3 VARCHAR(15)
      `);
      results.push("Added landline1-3 columns to leads");
    } catch (e: any) {
      results.push(`leads landline columns: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email1 VARCHAR(100)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email2 VARCHAR(100)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email3 VARCHAR(100)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email4 VARCHAR(100)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email5 VARCHAR(100)
      `);
      results.push("Added email1-5 columns to leads");
    } catch (e: any) {
      results.push(`leads email columns: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS tracerfy_queue_id INTEGER
      `);
      results.push("Added tracerfy_queue_id column to leads");
    } catch (e: any) {
      results.push(`leads tracerfy_queue_id: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_activity_score SMALLINT
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_contact_grade VARCHAR(1)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_line_type VARCHAR(20)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_name_match BOOLEAN
      `);
      results.push("Added phone scoring columns to leads");
    } catch (e: any) {
      results.push(`leads phone scoring: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_contact_grade VARCHAR(1)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_name_match BOOLEAN
      `);
      results.push("Added email scoring columns to leads");
    } catch (e: any) {
      results.push(`leads email scoring: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_tag VARCHAR(20) DEFAULT 'usbizdata'
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS sector_tag VARCHAR(50)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS sic_tag VARCHAR(10)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS sic_description VARCHAR(100)
      `);
      results.push("Added LUCI tag columns to leads");
    } catch (e: any) {
      results.push(`leads tag columns: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS county VARCHAR(50)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS website VARCHAR(255)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS employees VARCHAR(20)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS annual_sales VARCHAR(30)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS sic_code VARCHAR(10)
      `);
      results.push("Added business info columns to leads");
    } catch (e: any) {
      results.push(`leads business info: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(36)
      `);
      await this.db.execute(sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS sms_ready BOOLEAN DEFAULT false
      `);
      results.push("Added campaign columns to leads");
    } catch (e: any) {
      results.push(`leads campaign columns: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUSINESSES TABLE - Add missing columns
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this.db.execute(sql`
        ALTER TABLE businesses ADD COLUMN IF NOT EXISTS apollo_matched BOOLEAN DEFAULT false
      `);
      await this.db.execute(sql`
        ALTER TABLE businesses ADD COLUMN IF NOT EXISTS skip_traced BOOLEAN DEFAULT false
      `);
      results.push("Added apollo_matched and skip_traced to businesses");
    } catch (e: any) {
      results.push(`businesses columns: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SEQUENCE_ENROLLMENTS TABLE - Create if not exists
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS sequence_enrollments (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          lead_id VARCHAR(36) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          sequence_id VARCHAR(36),
          status VARCHAR(20) DEFAULT 'active',
          current_step INTEGER DEFAULT 0,
          enrolled_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      results.push("Created sequence_enrollments table");
    } catch (e: any) {
      results.push(`sequence_enrollments table: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APP_STATE TABLE - For persistence (key-value store)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this.db.execute(sql`
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
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS app_state_key_idx ON app_state(key)
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS app_state_team_idx ON app_state(team_id)
      `);
      results.push("Created app_state table");
    } catch (e: any) {
      results.push(`app_state table: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BATCH_JOBS TABLE - For job tracking
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this.db.execute(sql`
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
      results.push("Created batch_jobs table");
    } catch (e: any) {
      results.push(`batch_jobs table: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCHEDULED_CONTENT TABLE - Content calendar
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this.db.execute(sql`
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
      results.push("Created scheduled_content table");
    } catch (e: any) {
      results.push(`scheduled_content table: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CALL_QUEUE TABLE - Hot leads for calling
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS call_queue (
          id VARCHAR(36) PRIMARY KEY,
          team_id VARCHAR(36) NOT NULL,
          lead_id VARCHAR(36) REFERENCES leads(id) ON DELETE CASCADE,
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
      results.push("Created call_queue table");
    } catch (e: any) {
      results.push(`call_queue table: ${e.message}`);
    }

    // Add branding column to teams if it doesn't exist
    try {
      await this.db.execute(sql`
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS branding JSONB
      `);
      results.push("Added branding column to teams");
    } catch (e: any) {
      results.push(`branding column: ${e.message}`);
    }

    // Add description column to teams if it doesn't exist
    try {
      await this.db.execute(sql`
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT
      `);
      results.push("Added description column to teams");
    } catch (e: any) {
      results.push(`description column: ${e.message}`);
    }

    // Create api_keys table if it doesn't exist
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(36) PRIMARY KEY,
          key_hash VARCHAR(128) NOT NULL,
          key_prefix VARCHAR(16) NOT NULL,
          type VARCHAR(20) NOT NULL DEFAULT 'USER',
          team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
          name VARCHAR(100) NOT NULL,
          description VARCHAR(500),
          permissions JSONB,
          rate_limit VARCHAR(20) DEFAULT '1000/hour',
          is_active BOOLEAN NOT NULL DEFAULT true,
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP
        )
      `);
      results.push("Created api_keys table");
    } catch (e: any) {
      results.push(`api_keys table: ${e.message}`);
    }

    // Create indexes for api_keys
    try {
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_api_keys_team_id ON api_keys(team_id)
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active)
      `);
      results.push("Created api_keys indexes");
    } catch (e: any) {
      results.push(`api_keys indexes: ${e.message}`);
    }

    // Add inbox_items columns that may be missing
    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS classification VARCHAR DEFAULT 'UNCLASSIFIED' NOT NULL
      `);
      results.push("Added classification column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items classification: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS classification_confidence INTEGER DEFAULT 0
      `);
      results.push("Added classification_confidence column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items classification_confidence: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS classified_at TIMESTAMP
      `);
      results.push("Added classified_at column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items classified_at: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS classified_by VARCHAR
      `);
      results.push("Added classified_by column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items classified_by: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'WARM'
      `);
      results.push("Added priority column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items priority: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50 NOT NULL
      `);
      results.push("Added priority_score column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items priority_score: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS current_bucket VARCHAR DEFAULT 'UNIVERSAL_INBOX'
      `);
      results.push("Added current_bucket column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items current_bucket: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS due_at TIMESTAMP
      `);
      results.push("Added due_at column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items due_at: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP
      `);
      results.push("Added escalated_at column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items escalated_at: ${e.message}`);
    }

    try {
      await this.db.execute(sql`
        ALTER TABLE inbox_items
        ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0
      `);
      results.push("Added escalation_level column to inbox_items");
    } catch (e: any) {
      results.push(`inbox_items escalation_level: ${e.message}`);
    }

    // Create indexes for inbox_items classification
    try {
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS inbox_items_classification_idx ON inbox_items(classification)
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS inbox_items_priority_idx ON inbox_items(priority)
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS inbox_items_bucket_idx ON inbox_items(current_bucket)
      `);
      results.push("Created inbox_items indexes");
    } catch (e: any) {
      results.push(`inbox_items indexes: ${e.message}`);
    }

    return { success: true, results };
  }

  // INTERNAL API - Admin only, requires X-Admin-Key header
  @Post("setupdb")
  @UseGuards(AdminGuard)
  async setupAdmin() {
    const email =
      process.env.DEFAULT_ADMIN_EMAIL?.trim() || "admin@outreachglobal.io";

    // Find the user
    const user = await this.db.query.users.findFirst({
      where: (t, { eq }) => eq(t.email, email),
    });

    if (!user) {
      return { error: "User not found", email };
    }

    // Check if user has a team
    const existingTeam = await this.db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.ownerId, user.id),
    });

    if (existingTeam) {
      return { message: "Team already exists", team: existingTeam };
    }

    // Create team
    const now = new Date();
    const teamName = `${user.name || "Admin"}'s Team`;
    const slug =
      slugify(teamName) +
      "-" +
      Math.random().toString(16).slice(2, 8).toLowerCase();

    const [team] = await this.db
      .insert(teamsTable)
      .values({
        ownerId: user.id,
        name: teamName,
        slug,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.db.insert(teamMembersTable).values({
      teamId: team.id,
      userId: user.id,
      role: TeamMemberRole.OWNER,
      status: TeamMemberStatus.APPROVED,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, team };
  }
}
