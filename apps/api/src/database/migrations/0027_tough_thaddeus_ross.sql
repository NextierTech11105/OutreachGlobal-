CREATE TYPE "public"."lead_state_enum" AS ENUM('new', 'touched', 'responded', 'email_captured', 'high_intent', 'in_call_queue', 'closed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."lead_state_canonical" AS ENUM('new', 'touched', 'responded', 'email_captured', 'high_intent', 'in_call_queue', 'closed', 'suppressed');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"type" varchar(20) DEFAULT 'USER' NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"permissions" jsonb,
	"rate_limit" varchar(20) DEFAULT '1000/hour',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"event_type" varchar NOT NULL,
	"event_source" varchar NOT NULL,
	"dedupe_key" varchar,
	"previous_state" varchar,
	"new_state" varchar,
	"payload" jsonb,
	"processed_at" timestamp,
	"processing_notes" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_timers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"timer_type" varchar NOT NULL,
	"trigger_at" timestamp NOT NULL,
	"executed_at" timestamp,
	"cancelled_at" timestamp,
	"cancel_reason" varchar,
	"action" varchar DEFAULT 'check_response' NOT NULL,
	"action_payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"send_key" varchar NOT NULL,
	"channel" varchar DEFAULT 'sms' NOT NULL,
	"template_id" varchar,
	"template_name" varchar,
	"from_phone" varchar NOT NULL,
	"to_phone" varchar NOT NULL,
	"message_content" text NOT NULL,
	"worker" varchar,
	"campaign_id" varchar,
	"provider_message_id" varchar,
	"provider_status" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"cost_cents" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_receipts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"idempotency_key" varchar NOT NULL,
	"webhook_type" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"processed_at" timestamp,
	"processing_result" varchar,
	"error_message" text,
	"raw_payload" jsonb,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cartridge_attempts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"cartridge_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"attempt_number" integer NOT NULL,
	"tone" varchar NOT NULL,
	"template_id" varchar,
	"message_content" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"failed_reason" text,
	"replied_at" timestamp,
	"reply_content" text,
	"reply_intent" varchar,
	"triggered_by" varchar DEFAULT 'system' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cartridge_definitions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"stage" varchar NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"description" text,
	"template_sequence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delay_between_attempts_hours" integer DEFAULT 24 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cartridge_instances" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"definition_id" varchar(36),
	"stage" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"current_attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"current_tone" varchar,
	"template_sequence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delay_between_attempts_hours" integer DEFAULT 24 NOT NULL,
	"last_attempt_at" timestamp,
	"next_attempt_at" timestamp,
	"completed_at" timestamp,
	"interrupted_by" varchar,
	"interrupted_at" timestamp,
	"interrupt_reason" text,
	"assigned_by" varchar DEFAULT 'system' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_phone_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"phone_number_id" text NOT NULL,
	"phone_number" varchar NOT NULL,
	"lead_id" varchar(36),
	"is_primary" boolean DEFAULT true,
	"assigned_at" timestamp DEFAULT now(),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "call_queue" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"phone_from" varchar NOT NULL,
	"phone_to" varchar NOT NULL,
	"call_sid" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"priority" integer DEFAULT 50 NOT NULL,
	"scheduled_at" timestamp,
	"assigned_worker" varchar,
	"campaign_id" varchar(36),
	"lead_id" varchar(36),
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_attempt_at" timestamp,
	"queued_at" timestamp DEFAULT now(),
	"answered_at" timestamp,
	"completed_at" timestamp,
	"duration" integer,
	"recording_url" varchar,
	"voicemail_left" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversation_context" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"phone" varchar NOT NULL,
	"lead_id" varchar(36),
	"context" jsonb NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_intent" varchar,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dead_letter_queue" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36),
	"original_queue" varchar NOT NULL,
	"job_id" varchar,
	"job_name" varchar,
	"job_data" jsonb,
	"error_message" text NOT NULL,
	"error_stack" text,
	"attempts_made" integer DEFAULT 0 NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"resolution_notes" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"failed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "event_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36),
	"event_type" varchar NOT NULL,
	"event_id" varchar,
	"level" varchar DEFAULT 'info' NOT NULL,
	"payload" jsonb,
	"source" varchar,
	"correlation_id" varchar,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_signals" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"signal_type" varchar NOT NULL,
	"signal_value" jsonb,
	"confidence" integer DEFAULT 100 NOT NULL,
	"source" varchar NOT NULL,
	"source_event_id" varchar(36),
	"ai_reason" varchar,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"action" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"recommended_by" varchar NOT NULL,
	"ai_reason" text NOT NULL,
	"confidence" integer DEFAULT 80 NOT NULL,
	"content" text,
	"content_edited" text,
	"action_metadata" jsonb,
	"trigger_signal_id" varchar(36),
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"executed_at" timestamp,
	"execution_result" jsonb,
	"expires_at" timestamp,
	"is_urgent" boolean DEFAULT false,
	"requires_review" boolean DEFAULT true,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "neva_citations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"research_job_id" varchar(36),
	"enrichment_id" varchar(36),
	"url" text NOT NULL,
	"title" text,
	"source" text,
	"published_at" timestamp,
	"accessed_at" timestamp,
	"snippet" text,
	"relevance" integer,
	"category" varchar,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neva_enrichments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"trigger" varchar NOT NULL,
	"company_intel" jsonb,
	"person_intel" jsonb,
	"realtime_context" jsonb,
	"enrichment_score" integer,
	"confidence_score" integer,
	"enriched_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "neva_enrichments_lead_trigger_unique" UNIQUE("lead_id","trigger")
);
--> statement-breakpoint
CREATE TABLE "neva_market_data" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"research_job_id" varchar(36),
	"industry" text NOT NULL,
	"geography" text DEFAULT 'United States',
	"tam" jsonb,
	"sam" jsonb,
	"som" jsonb,
	"growth_rate" text,
	"cagr" text,
	"competitors" jsonb,
	"trends" jsonb,
	"drivers" jsonb,
	"challenges" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "neva_personas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"research_job_id" varchar(36),
	"title" text NOT NULL,
	"industry" text,
	"demographics" jsonb,
	"psychographics" jsonb,
	"professional" jsonb,
	"pain_points" jsonb,
	"goals" jsonb,
	"buying_behavior" jsonb,
	"messaging_angles" jsonb,
	"content_preferences" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neva_research_jobs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"target" text NOT NULL,
	"target_type" varchar NOT NULL,
	"lead_id" varchar(36),
	"research_type" varchar DEFAULT 'full',
	"depth" varchar DEFAULT 'standard',
	"focus_areas" jsonb DEFAULT '[]'::jsonb,
	"status" varchar DEFAULT 'queued',
	"progress" integer DEFAULT 0,
	"executive_summary" jsonb,
	"raw_data" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0
);
--> statement-breakpoint
DROP INDEX "campaign_executions_campaign_id_index";--> statement-breakpoint
DROP INDEX "campaign_executions_lead_id_index";--> statement-breakpoint
DROP INDEX "campaign_executions_sequence_id_index";--> statement-breakpoint
DROP INDEX "inbox_items_team_id_index";--> statement-breakpoint
DROP INDEX "inbox_items_lead_id_index";--> statement-breakpoint
DROP INDEX "inbox_items_current_bucket_index";--> statement-breakpoint
DROP INDEX "inbox_items_priority_index";--> statement-breakpoint
DROP INDEX "inbox_items_classification_index";--> statement-breakpoint
DROP INDEX "inbox_items_is_processed_index";--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD COLUMN "due_at" timestamp;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD COLUMN "escalated_at" timestamp;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD COLUMN "escalation_level" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "response_buckets" ADD COLUMN "sla_minutes" integer;--> statement-breakpoint
ALTER TABLE "response_buckets" ADD COLUMN "worker" varchar;--> statement-breakpoint
ALTER TABLE "response_buckets" ADD COLUMN "bucket_category" varchar DEFAULT 'response';--> statement-breakpoint
ALTER TABLE "response_buckets" ADD COLUMN "target_capacity" integer DEFAULT 2000;--> statement-breakpoint
ALTER TABLE "response_buckets" ADD COLUMN "current_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "response_buckets" ADD COLUMN "flow_position" integer;--> statement-breakpoint
ALTER TABLE "response_buckets" ADD COLUMN "flow_connections" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "pipeline_status" varchar DEFAULT 'raw' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lead_state" "lead_state_canonical" DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "team_id" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "property_distress_scores" ADD COLUMN "team_id" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "outbound_number_id" varchar(36);--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_timers" ADD CONSTRAINT "lead_timers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_timers" ADD CONSTRAINT "lead_timers_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_receipts" ADD CONSTRAINT "webhook_receipts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartridge_attempts" ADD CONSTRAINT "cartridge_attempts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartridge_attempts" ADD CONSTRAINT "cartridge_attempts_cartridge_id_cartridge_instances_id_fk" FOREIGN KEY ("cartridge_id") REFERENCES "public"."cartridge_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartridge_attempts" ADD CONSTRAINT "cartridge_attempts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartridge_definitions" ADD CONSTRAINT "cartridge_definitions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartridge_instances" ADD CONSTRAINT "cartridge_instances_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartridge_instances" ADD CONSTRAINT "cartridge_instances_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartridge_instances" ADD CONSTRAINT "cartridge_instances_definition_id_cartridge_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."cartridge_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_phone_assignments" ADD CONSTRAINT "campaign_phone_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_phone_assignments" ADD CONSTRAINT "campaign_phone_assignments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_phone_assignments" ADD CONSTRAINT "campaign_phone_assignments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_queue" ADD CONSTRAINT "call_queue_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_queue" ADD CONSTRAINT "call_queue_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_context" ADD CONSTRAINT "conversation_context_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_context" ADD CONSTRAINT "conversation_context_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD CONSTRAINT "dead_letter_queue_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_signals" ADD CONSTRAINT "lead_signals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_signals" ADD CONSTRAINT "lead_signals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_signals" ADD CONSTRAINT "lead_signals_source_event_id_event_log_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."event_log"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_trigger_signal_id_lead_signals_id_fk" FOREIGN KEY ("trigger_signal_id") REFERENCES "public"."lead_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_citations" ADD CONSTRAINT "neva_citations_research_job_id_neva_research_jobs_id_fk" FOREIGN KEY ("research_job_id") REFERENCES "public"."neva_research_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_citations" ADD CONSTRAINT "neva_citations_enrichment_id_neva_enrichments_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."neva_enrichments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_enrichments" ADD CONSTRAINT "neva_enrichments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_enrichments" ADD CONSTRAINT "neva_enrichments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_market_data" ADD CONSTRAINT "neva_market_data_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_market_data" ADD CONSTRAINT "neva_market_data_research_job_id_neva_research_jobs_id_fk" FOREIGN KEY ("research_job_id") REFERENCES "public"."neva_research_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_personas" ADD CONSTRAINT "neva_personas_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_personas" ADD CONSTRAINT "neva_personas_research_job_id_neva_research_jobs_id_fk" FOREIGN KEY ("research_job_id") REFERENCES "public"."neva_research_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_research_jobs" ADD CONSTRAINT "neva_research_jobs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neva_research_jobs" ADD CONSTRAINT "neva_research_jobs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_team_id_index" ON "api_keys" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_index" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_key_prefix_index" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "api_keys_type_index" ON "api_keys" USING btree ("type");--> statement-breakpoint
CREATE INDEX "api_keys_is_active_index" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "lead_events_lead_created_idx" ON "lead_events" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_events_dedupe_idx" ON "lead_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "lead_events_type_idx" ON "lead_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "lead_events_team_idx" ON "lead_events" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lead_events_tenant_idx" ON "lead_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lead_events_state_transition_idx" ON "lead_events" USING btree ("previous_state","new_state");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_timers_lead_type_idx" ON "lead_timers" USING btree ("lead_id","timer_type");--> statement-breakpoint
CREATE INDEX "lead_timers_trigger_idx" ON "lead_timers" USING btree ("trigger_at");--> statement-breakpoint
CREATE INDEX "lead_timers_active_idx" ON "lead_timers" USING btree ("team_id","executed_at","cancelled_at");--> statement-breakpoint
CREATE INDEX "lead_timers_team_idx" ON "lead_timers" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_messages_send_key_idx" ON "outbound_messages" USING btree ("send_key");--> statement-breakpoint
CREATE INDEX "outbound_messages_provider_idx" ON "outbound_messages" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "outbound_messages_lead_idx" ON "outbound_messages" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "outbound_messages_worker_idx" ON "outbound_messages" USING btree ("worker");--> statement-breakpoint
CREATE INDEX "outbound_messages_status_idx" ON "outbound_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outbound_messages_team_idx" ON "outbound_messages" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_receipts_idem_key_idx" ON "webhook_receipts" USING btree ("team_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "webhook_receipts_type_idx" ON "webhook_receipts" USING btree ("webhook_type");--> statement-breakpoint
CREATE INDEX "webhook_receipts_expires_idx" ON "webhook_receipts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "cartridge_att_team_idx" ON "cartridge_attempts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "cartridge_att_cartridge_idx" ON "cartridge_attempts" USING btree ("cartridge_id");--> statement-breakpoint
CREATE INDEX "cartridge_att_lead_idx" ON "cartridge_attempts" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "cartridge_att_status_idx" ON "cartridge_attempts" USING btree ("status","replied_at");--> statement-breakpoint
CREATE INDEX "cartridge_def_team_idx" ON "cartridge_definitions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "cartridge_def_stage_idx" ON "cartridge_definitions" USING btree ("team_id","stage");--> statement-breakpoint
CREATE INDEX "cartridge_def_name_idx" ON "cartridge_definitions" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "cartridge_inst_team_idx" ON "cartridge_instances" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "cartridge_inst_lead_idx" ON "cartridge_instances" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "cartridge_inst_lead_status_idx" ON "cartridge_instances" USING btree ("lead_id","status");--> statement-breakpoint
CREATE INDEX "cartridge_inst_next_attempt_idx" ON "cartridge_instances" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "cpa_team_idx" ON "campaign_phone_assignments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "cpa_campaign_idx" ON "campaign_phone_assignments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "cpa_phone_idx" ON "campaign_phone_assignments" USING btree ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "cpa_campaign_phone_unique" ON "campaign_phone_assignments" USING btree ("campaign_id","phone_number");--> statement-breakpoint
CREATE INDEX "call_queue_team_status_idx" ON "call_queue" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "call_queue_scheduled_idx" ON "call_queue" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "call_queue_worker_idx" ON "call_queue" USING btree ("assigned_worker");--> statement-breakpoint
CREATE INDEX "call_queue_lead_idx" ON "call_queue" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "conv_ctx_phone_team_idx" ON "conversation_context" USING btree ("phone","team_id");--> statement-breakpoint
CREATE INDEX "conv_ctx_expires_idx" ON "conversation_context" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "conv_ctx_lead_idx" ON "conversation_context" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "dlq_queue_idx" ON "dead_letter_queue" USING btree ("original_queue");--> statement-breakpoint
CREATE INDEX "dlq_status_idx" ON "dead_letter_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dlq_failed_at_idx" ON "dead_letter_queue" USING btree ("failed_at");--> statement-breakpoint
CREATE INDEX "dlq_team_idx" ON "dead_letter_queue" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "event_log_team_idx" ON "event_log" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "event_log_type_idx" ON "event_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "event_log_occurred_idx" ON "event_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "event_log_correlation_idx" ON "event_log" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "event_log_event_id_idx" ON "event_log" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "lead_signals_lead_created_idx" ON "lead_signals" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "lead_signals_type_idx" ON "lead_signals" USING btree ("signal_type");--> statement-breakpoint
CREATE INDEX "lead_signals_team_idx" ON "lead_signals" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lead_signals_team_type_created_idx" ON "lead_signals" USING btree ("team_id","signal_type","created_at");--> statement-breakpoint
CREATE INDEX "lead_signals_source_idx" ON "lead_signals" USING btree ("source");--> statement-breakpoint
CREATE INDEX "recommendations_team_status_idx" ON "recommendations" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "recommendations_pending_priority_idx" ON "recommendations" USING btree ("team_id","status","priority");--> statement-breakpoint
CREATE INDEX "recommendations_lead_idx" ON "recommendations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "recommendations_worker_idx" ON "recommendations" USING btree ("recommended_by");--> statement-breakpoint
CREATE INDEX "recommendations_expires_idx" ON "recommendations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "recommendations_action_idx" ON "recommendations" USING btree ("action");--> statement-breakpoint
CREATE INDEX "neva_citations_job_idx" ON "neva_citations" USING btree ("research_job_id");--> statement-breakpoint
CREATE INDEX "neva_citations_enrichment_idx" ON "neva_citations" USING btree ("enrichment_id");--> statement-breakpoint
CREATE INDEX "neva_enrichments_lead_idx" ON "neva_enrichments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "neva_enrichments_team_idx" ON "neva_enrichments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "neva_enrichments_expires_idx" ON "neva_enrichments" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "neva_enrichments_score_idx" ON "neva_enrichments" USING btree ("enrichment_score");--> statement-breakpoint
CREATE INDEX "neva_market_team_idx" ON "neva_market_data" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "neva_market_industry_idx" ON "neva_market_data" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "neva_personas_team_idx" ON "neva_personas" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "neva_personas_job_idx" ON "neva_personas" USING btree ("research_job_id");--> statement-breakpoint
CREATE INDEX "neva_personas_industry_idx" ON "neva_personas" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "neva_jobs_team_idx" ON "neva_research_jobs" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "neva_jobs_status_idx" ON "neva_research_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "neva_jobs_lead_idx" ON "neva_research_jobs" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "neva_jobs_created_idx" ON "neva_research_jobs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_distress_scores" ADD CONSTRAINT "property_distress_scores_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_outbound_number_id_campaign_phone_assignments_id_fk" FOREIGN KEY ("outbound_number_id") REFERENCES "public"."campaign_phone_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_exec_campaign_idx" ON "campaign_executions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_exec_lead_idx" ON "campaign_executions" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "campaign_exec_sequence_idx" ON "campaign_executions" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "campaign_exec_active_hot_idx" ON "campaign_executions" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaign_leads_next_run_idx" ON "campaign_leads" USING btree ("next_sequence_run_at");--> statement-breakpoint
CREATE INDEX "campaign_leads_status_idx" ON "campaign_leads" USING btree ("status","current_sequence_status");--> statement-breakpoint
CREATE INDEX "campaign_seq_position_idx" ON "campaign_sequences" USING btree ("campaign_id","position");--> statement-breakpoint
CREATE INDEX "inbox_items_team_idx" ON "inbox_items" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "inbox_items_lead_idx" ON "inbox_items" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "inbox_items_bucket_idx" ON "inbox_items" USING btree ("current_bucket");--> statement-breakpoint
CREATE INDEX "inbox_items_priority_idx" ON "inbox_items" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "inbox_items_classification_idx" ON "inbox_items" USING btree ("classification");--> statement-breakpoint
CREATE INDEX "inbox_items_processed_idx" ON "inbox_items" USING btree ("is_processed");--> statement-breakpoint
CREATE INDEX "inbox_items_processing_hot_idx" ON "inbox_items" USING btree ("team_id","is_processed","priority");--> statement-breakpoint
CREATE INDEX "inbox_items_sla_due_idx" ON "inbox_items" USING btree ("due_at","is_processed");--> statement-breakpoint
CREATE INDEX "response_buckets_team_category_idx" ON "response_buckets" USING btree ("team_id","bucket_category");--> statement-breakpoint
CREATE INDEX "response_buckets_worker_idx" ON "response_buckets" USING btree ("worker");--> statement-breakpoint
CREATE INDEX "response_buckets_flow_position_idx" ON "response_buckets" USING btree ("team_id","flow_position");--> statement-breakpoint
CREATE INDEX "lead_phone_numbers_phone_idx" ON "lead_phone_numbers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "lead_phone_numbers_lead_phone_idx" ON "lead_phone_numbers" USING btree ("lead_id","phone");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "leads_team_phone_idx" ON "leads" USING btree ("team_id","phone");--> statement-breakpoint
CREATE INDEX "leads_team_status_idx" ON "leads" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "leads_team_pipeline_idx" ON "leads" USING btree ("team_id","pipeline_status");--> statement-breakpoint
CREATE INDEX "leads_team_created_idx" ON "leads" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_team_lead_state_idx" ON "leads" USING btree ("team_id","lead_state");--> statement-breakpoint
CREATE INDEX "properties_team_id_index" ON "properties" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "property_distress_scores_team_id_index" ON "property_distress_scores" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "messages_team_idx" ON "messages" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "messages_lead_idx" ON "messages" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "messages_campaign_idx" ON "messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "messages_to_address_idx" ON "messages" USING btree ("to_address");--> statement-breakpoint
CREATE INDEX "messages_from_address_idx" ON "messages" USING btree ("from_address");--> statement-breakpoint
CREATE INDEX "messages_team_to_address_idx" ON "messages" USING btree ("team_id","to_address");--> statement-breakpoint
CREATE INDEX "messages_team_status_idx" ON "messages" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "messages_team_created_idx" ON "messages" USING btree ("team_id","created_at");