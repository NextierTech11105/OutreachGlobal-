CREATE TABLE "ai_sdr_avatars" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"personality" varchar NOT NULL,
	"voice_type" varchar NOT NULL,
	"avatar_uri" varchar,
	"active" boolean DEFAULT true,
	"industry" varchar NOT NULL,
	"mission" varchar NOT NULL,
	"goal" varchar NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"sequence_id" varchar(36),
	"lead_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_executions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"sequence_id" varchar(36) NOT NULL,
	"status" varchar DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_leads" (
	"campaign_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"current_sequence_position" integer DEFAULT 1 NOT NULL,
	"current_sequence_status" varchar DEFAULT 'PENDING' NOT NULL,
	"last_sequence_executed_at" timestamp,
	"next_sequence_run_at" timestamp,
	"status" varchar DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_sequences" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"type" varchar NOT NULL,
	"name" varchar NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL,
	"subject" varchar,
	"voice_type" varchar,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"delay_hours" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"sdr_id" varchar(36),
	"name" varchar NOT NULL,
	"description" text,
	"target_method" varchar DEFAULT 'SCORE_BASED' NOT NULL,
	"min_score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"location" jsonb,
	"status" varchar DEFAULT 'DRAFT' NOT NULL,
	"estimated_leads_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal_access_tokens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"expired_at" timestamp,
	"last_used_at" timestamp,
	"user_agent" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"role" varchar DEFAULT 'USER' NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password" text NOT NULL,
	"email_verified_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"role" varchar DEFAULT 'MEMBER' NOT NULL,
	"status" varchar DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"owner_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"type" varchar NOT NULL,
	"name" varchar NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_fields" (
	"key" varchar PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL,
	"description" text,
	"resource" varchar,
	"input_type" varchar NOT NULL,
	"display_type" varchar,
	"value_type" varchar NOT NULL,
	"validations" jsonb,
	"possible_object_types" text[],
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "workflow_fields_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "workflow_links" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workflow_id" varchar(36) NOT NULL,
	"source_step_id" varchar(36) NOT NULL,
	"target_step_id" varchar(36) NOT NULL,
	"source_port" varchar NOT NULL,
	"target_port" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workflow_id" varchar(36) NOT NULL,
	"started_at" timestamp NOT NULL,
	"status" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_step_fields" (
	"workflow_id" varchar(36) NOT NULL,
	"step_id" varchar(36) NOT NULL,
	"key" varchar NOT NULL,
	"is_reference" boolean DEFAULT false NOT NULL,
	"value_ref" varchar NOT NULL,
	"value" text,
	CONSTRAINT "workflow_step_fields_step_id_key_pk" PRIMARY KEY("step_id","key")
);
--> statement-breakpoint
CREATE TABLE "workflow_step_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"run_id" varchar(36) NOT NULL,
	"step_id" varchar(36) NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"retries" integer DEFAULT 0 NOT NULL,
	"successes" integer DEFAULT 0 NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"workflow_id" varchar(36) NOT NULL,
	"task_id" varchar NOT NULL,
	"task_type" varchar NOT NULL,
	"position" jsonb NOT NULL,
	"description" text,
	"conditions" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_task_fields" (
	"task_id" varchar NOT NULL,
	"field_key" varchar NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "workflow_task_fields_task_id_field_key_pk" PRIMARY KEY("task_id","field_key")
);
--> statement-breakpoint
CREATE TABLE "workflow_tasks" (
	"id" varchar NOT NULL,
	"version" varchar DEFAULT '0.1' NOT NULL,
	"label" varchar NOT NULL,
	"description" varchar,
	"categories" text[] NOT NULL,
	"type" varchar NOT NULL,
	"output_ports" text[] NOT NULL,
	"input_port" varchar,
	"paths" text[] NOT NULL,
	"object_types" text[],
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "workflow_tasks_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"version" varchar(36) NOT NULL,
	"parent_version" varchar(36),
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "integration_fields" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"integration_id" varchar(36) NOT NULL,
	"module_name" varchar NOT NULL,
	"source_field" varchar NOT NULL,
	"target_field" varchar NOT NULL,
	"sub_field" varchar,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "integration_tasks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"integration_id" varchar(36) NOT NULL,
	"module_name" varchar NOT NULL,
	"status" varchar DEFAULT 'PENDING' NOT NULL,
	"type" varchar NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"enabled" boolean NOT NULL,
	"settings" jsonb,
	"auth_data" jsonb,
	"token_expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"integration_id" varchar(36),
	"external_id" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"email" varchar,
	"phone" varchar,
	"title" varchar,
	"company" varchar,
	"status" varchar,
	"score" integer DEFAULT 0,
	"tags" text[],
	"zip_code" varchar,
	"country" varchar,
	"state" varchar,
	"city" varchar,
	"address" varchar,
	"source" varchar,
	"notes" text,
	"metadata" jsonb,
	"custom_fields" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "property_distress_scores" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"external_id" varchar,
	"uid" varchar,
	"address" text,
	"owner_name" varchar,
	"owner_type" varchar,
	"equity_percent" integer,
	"is_vacant" boolean DEFAULT false,
	"loan_maturity_date" date,
	"reverse_mortgage" boolean DEFAULT false,
	"zoning" varchar,
	"score" integer DEFAULT 0,
	"last_signal_update" timestamp,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ai_sdr_avatars" ADD CONSTRAINT "ai_sdr_avatars_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_sequence_id_campaign_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."campaign_sequences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_executions" ADD CONSTRAINT "campaign_executions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_executions" ADD CONSTRAINT "campaign_executions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_executions" ADD CONSTRAINT "campaign_executions_sequence_id_campaign_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."campaign_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sequences" ADD CONSTRAINT "campaign_sequences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sdr_id_ai_sdr_avatars_id_fk" FOREIGN KEY ("sdr_id") REFERENCES "public"."ai_sdr_avatars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_links" ADD CONSTRAINT "workflow_links_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_links" ADD CONSTRAINT "workflow_links_source_step_id_workflow_steps_id_fk" FOREIGN KEY ("source_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_links" ADD CONSTRAINT "workflow_links_target_step_id_workflow_steps_id_fk" FOREIGN KEY ("target_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_fields" ADD CONSTRAINT "workflow_step_fields_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_fields" ADD CONSTRAINT "workflow_step_fields_step_id_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_fields" ADD CONSTRAINT "workflow_step_fields_key_workflow_fields_key_fk" FOREIGN KEY ("key") REFERENCES "public"."workflow_fields"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_step_id_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_task_id_workflow_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."workflow_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_task_fields" ADD CONSTRAINT "workflow_task_fields_task_id_workflow_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."workflow_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_task_fields" ADD CONSTRAINT "workflow_task_fields_field_key_workflow_fields_key_fk" FOREIGN KEY ("field_key") REFERENCES "public"."workflow_fields"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_fields" ADD CONSTRAINT "integration_fields_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_tasks" ADD CONSTRAINT "integration_tasks_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_events_campaign_id_index" ON "campaign_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_events_sequence_id_index" ON "campaign_events" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "campaign_events_lead_id_index" ON "campaign_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "campaign_executions_campaign_id_index" ON "campaign_executions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_executions_lead_id_index" ON "campaign_executions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "campaign_executions_sequence_id_index" ON "campaign_executions" USING btree ("sequence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_leads_campaign_id_lead_id_index" ON "campaign_leads" USING btree ("campaign_id","lead_id");--> statement-breakpoint
CREATE INDEX "campaign_sequences_campaign_id_index" ON "campaign_sequences" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "personal_access_tokens_user_id_index" ON "personal_access_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_members_team_id_index" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_index" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teams_owner_id_index" ON "teams" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "workflow_links_workflow_id_index" ON "workflow_links" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_links_source_step_id_index" ON "workflow_links" USING btree ("source_step_id");--> statement-breakpoint
CREATE INDEX "workflow_links_target_step_id_index" ON "workflow_links" USING btree ("target_step_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_workflow_id_index" ON "workflow_runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_step_fields_workflow_id_index" ON "workflow_step_fields" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_step_runs_run_id_index" ON "workflow_step_runs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "workflow_step_runs_step_id_index" ON "workflow_step_runs" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_workflow_id_index" ON "workflow_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_task_id_index" ON "workflow_steps" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "workflows_team_id_index" ON "workflows" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_fields_integration_id_module_name_source_field_index" ON "integration_fields" USING btree ("integration_id","module_name","source_field");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_name_team_id_index" ON "integrations" USING btree ("name","team_id");--> statement-breakpoint
CREATE INDEX "leads_team_id_index" ON "leads" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_team_id_integration_id_external_id_index" ON "leads" USING btree ("team_id","integration_id","external_id");