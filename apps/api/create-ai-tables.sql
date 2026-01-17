-- Create auto_respond_templates table
CREATE TABLE IF NOT EXISTS "auto_respond_templates" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "team_id" varchar(36) NOT NULL,
  "agent_type" varchar(20) NOT NULL,
  "category" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "template" text NOT NULL,
  "variables" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 0,
  "usage_count" integer NOT NULL DEFAULT 0,
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create ai_prompts table
CREATE TABLE IF NOT EXISTS "ai_prompts" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "team_id" varchar(36) NOT NULL,
  "prompt_key" varchar(50) NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "name" varchar(255) NOT NULL,
  "description" text,
  "system_prompt" text NOT NULL,
  "user_prompt_template" text,
  "model" varchar(50) NOT NULL DEFAULT 'gpt-4o-mini',
  "temperature" real NOT NULL DEFAULT 0.7,
  "max_tokens" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_default" boolean NOT NULL DEFAULT false,
  "usage_count" integer NOT NULL DEFAULT 0,
  "avg_latency_ms" integer,
  "success_rate" real,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "auto_respond_team_agent_category_idx" ON "auto_respond_templates" ("team_id", "agent_type", "category");
CREATE INDEX IF NOT EXISTS "auto_respond_active_idx" ON "auto_respond_templates" ("is_active");
CREATE INDEX IF NOT EXISTS "auto_respond_team_idx" ON "auto_respond_templates" ("team_id");

CREATE INDEX IF NOT EXISTS "ai_prompts_team_key_idx" ON "ai_prompts" ("team_id", "prompt_key");
CREATE INDEX IF NOT EXISTS "ai_prompts_active_idx" ON "ai_prompts" ("is_active");
CREATE INDEX IF NOT EXISTS "ai_prompts_team_idx" ON "ai_prompts" ("team_id");
