CREATE TYPE "public"."document_type" AS ENUM('training_data', 'objection_library', 'faq', 'product_info', 'competitor_intel', 'case_study', 'script', 'persona', 'industry', 'compliance');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('sms_single', 'sms_blast', 'sms_drip', 'call_single', 'call_power', 'email_single', 'email_sequence', 'appointment', 'follow_up', 'reminder');--> statement-breakpoint
CREATE TABLE "achievement_definitions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"type" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text NOT NULL,
	"icon" varchar NOT NULL,
	"tier" varchar NOT NULL,
	"points_value" integer DEFAULT 10 NOT NULL,
	"target_count" integer DEFAULT 1 NOT NULL,
	"category" varchar NOT NULL,
	"is_repeatable" boolean DEFAULT false,
	"animation" varchar DEFAULT 'bounce',
	"sound_effect" varchar,
	"color" varchar DEFAULT '#6366f1',
	"glow_color" varchar DEFAULT '#818cf8',
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "achievement_notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"achievement_id" varchar(36) NOT NULL,
	"is_displayed" boolean DEFAULT false,
	"displayed_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"period" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"rankings" jsonb NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"achievement_id" varchar(36) NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"current_count" integer DEFAULT 1 NOT NULL,
	"displayed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"points_to_next_level" integer DEFAULT 100 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" timestamp,
	"numbers_confirmed" integer DEFAULT 0 NOT NULL,
	"positive_responses" integer DEFAULT 0 NOT NULL,
	"leads_converted" integer DEFAULT 0 NOT NULL,
	"campaigns_completed" integer DEFAULT 0 NOT NULL,
	"messages_processed" integer DEFAULT 0 NOT NULL,
	"blacklist_reviewed" integer DEFAULT 0 NOT NULL,
	"avg_response_time" integer,
	"success_rate" integer,
	"daily_goal_progress" integer DEFAULT 0,
	"daily_goal_target" integer DEFAULT 50,
	"weekly_rank" integer,
	"monthly_rank" integer,
	"all_time_rank" integer,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "persona_addresses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"street" varchar NOT NULL,
	"street2" varchar,
	"city" varchar NOT NULL,
	"state" varchar NOT NULL,
	"zip" varchar NOT NULL,
	"zip4" varchar,
	"county" varchar,
	"country" varchar DEFAULT 'US' NOT NULL,
	"address_type" varchar DEFAULT 'unknown' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"move_in_date" timestamp,
	"move_out_date" timestamp,
	"years_at_address" integer,
	"latitude" real,
	"longitude" real,
	"source" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"setter_id" varchar(36),
	"closer_id" varchar(36),
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"status" varchar DEFAULT 'scheduled',
	"meeting_link" text,
	"notes" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "business_owners" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"business_id" varchar(36) NOT NULL,
	"title" varchar,
	"role_type" varchar DEFAULT 'unknown' NOT NULL,
	"role_confidence" real DEFAULT 0.5 NOT NULL,
	"is_decision_maker" boolean DEFAULT false NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_c_level" boolean DEFAULT false NOT NULL,
	"is_partner" boolean DEFAULT false NOT NULL,
	"is_investor" boolean DEFAULT false NOT NULL,
	"is_sales_lead" boolean DEFAULT false NOT NULL,
	"department" varchar,
	"seniority_level" varchar,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_current" boolean DEFAULT true NOT NULL,
	"preferred_channel" varchar,
	"source" varchar NOT NULL,
	"match_confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"normalized_name" varchar NOT NULL,
	"legal_name" varchar,
	"dba" varchar,
	"sic_code" varchar,
	"sic_description" varchar,
	"naics_code" varchar,
	"naics_description" varchar,
	"sector" varchar,
	"sub_sector" varchar,
	"phone" varchar,
	"email" varchar,
	"website" varchar,
	"street" varchar,
	"street2" varchar,
	"city" varchar,
	"state" varchar,
	"zip" varchar,
	"county" varchar,
	"latitude" real,
	"longitude" real,
	"employee_count" integer,
	"employee_range" varchar,
	"annual_revenue" integer,
	"revenue_range" varchar,
	"year_founded" integer,
	"years_in_business" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"entity_type" varchar,
	"state_of_incorporation" varchar,
	"source_file" varchar,
	"source_record_id" varchar,
	"apollo_enriched" boolean DEFAULT false NOT NULL,
	"apollo_enriched_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "automation_plays" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"color" varchar DEFAULT 'blue',
	"icon" varchar DEFAULT 'zap',
	"trigger_type" varchar NOT NULL,
	"trigger_config" jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"times_run" integer DEFAULT 0,
	"last_run_at" timestamp,
	"success_rate" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_draft" boolean DEFAULT false,
	"created_by_id" varchar(36),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_cadences" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"cadence_type" varchar DEFAULT 'drip',
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"send_window" jsonb,
	"total_enrolled" integer DEFAULT 0,
	"total_completed" integer DEFAULT 0,
	"response_rate" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversation_labels" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"color" varchar DEFAULT 'gray',
	"icon" varchar,
	"auto_apply_on" jsonb,
	"count" integer DEFAULT 0,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "intelligence_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"event_type" varchar NOT NULL,
	"lead_id" varchar(36),
	"worker_id" varchar,
	"campaign_id" varchar(36),
	"input_message" text,
	"output_message" text,
	"outcome" varchar,
	"was_successful" boolean,
	"patterns" jsonb,
	"human_feedback" varchar,
	"edited_response" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"uploaded_by_id" varchar(36),
	"title" varchar NOT NULL,
	"description" text,
	"document_type" "document_type" DEFAULT 'training_data',
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" varchar,
	"content" text,
	"summary" text,
	"embeddings" jsonb,
	"tags" text[] DEFAULT '{}',
	"category" varchar,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true,
	"is_processed" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_labels" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"label_id" varchar(36) NOT NULL,
	"applied_at" timestamp DEFAULT now(),
	"applied_by" varchar(36),
	"source" varchar DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE "scheduled_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"campaign_id" varchar(36),
	"lead_id" varchar(36),
	"created_by_id" varchar(36),
	"event_type" "event_type" NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"scheduled_at" timestamp NOT NULL,
	"executed_at" timestamp,
	"completed_at" timestamp,
	"timezone" varchar DEFAULT 'America/New_York',
	"cadence_step" integer,
	"cadence_delay" integer,
	"parent_event_id" varchar(36),
	"content" text,
	"template_id" varchar(36),
	"worker_id" varchar,
	"worker_personality_id" varchar(36),
	"status" "event_status" DEFAULT 'scheduled',
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"last_error" text,
	"phone_number" varchar,
	"email" varchar,
	"recipient_name" varchar,
	"result" jsonb,
	"color" varchar DEFAULT '#3b82f6',
	"all_day" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "worker_voice_configs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"worker_id" varchar NOT NULL,
	"worker_name" varchar NOT NULL,
	"warmth" integer DEFAULT 70,
	"directness" integer DEFAULT 60,
	"humor" integer DEFAULT 40,
	"formality" integer DEFAULT 30,
	"urgency" integer DEFAULT 50,
	"assertiveness" integer DEFAULT 65,
	"empathy" integer DEFAULT 70,
	"closing_push" integer DEFAULT 55,
	"tone_preset" varchar DEFAULT 'friendly',
	"custom_instructions" text,
	"templates" jsonb,
	"industry_terms" text[] DEFAULT '{}',
	"blacklisted_words" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36),
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(20),
	"parent_id" varchar(36),
	"sort_order" integer DEFAULT 0,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36),
	"category_id" varchar(36),
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"content_type" varchar DEFAULT 'PROMPT' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"external_url" text,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"visibility" varchar DEFAULT 'TEAM',
	"created_by_id" varchar(36),
	"is_active" boolean DEFAULT true,
	"is_favorite" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_usage_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"content_item_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"used_in" varchar,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_demographics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"education" varchar,
	"education_level" varchar,
	"occupation" varchar,
	"occupation_category" varchar,
	"employer" varchar,
	"employer_industry" varchar,
	"job_title" varchar,
	"income_range" varchar,
	"income_estimate" integer,
	"net_worth_range" varchar,
	"net_worth_estimate" integer,
	"marital_status" varchar,
	"household_size" integer,
	"has_children" boolean,
	"number_of_children" integer,
	"home_owner_status" varchar,
	"length_of_residence" integer,
	"home_value" integer,
	"interests" text[],
	"political_affiliation" varchar,
	"religion" varchar,
	"ethnicity" varchar,
	"credit_range" varchar,
	"source" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "persona_emails" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"email_address" varchar NOT NULL,
	"normalized_address" varchar NOT NULL,
	"email_type" varchar DEFAULT 'unknown' NOT NULL,
	"domain" varchar,
	"is_valid" boolean DEFAULT true NOT NULL,
	"is_deliverable" boolean,
	"is_disposable" boolean DEFAULT false NOT NULL,
	"is_catch_all" boolean,
	"is_unsubscribed" boolean DEFAULT false NOT NULL,
	"unsubscribed_at" timestamp,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source" varchar NOT NULL,
	"score" real DEFAULT 0.5 NOT NULL,
	"last_verified_at" timestamp,
	"verification_source" varchar,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bucket_movements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"inbox_item_id" varchar(36) NOT NULL,
	"from_bucket" varchar,
	"to_bucket" varchar NOT NULL,
	"moved_by" varchar NOT NULL,
	"reason" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36),
	"message_id" varchar(36),
	"campaign_id" varchar(36),
	"assigned_sdr_id" varchar(36),
	"classification" varchar DEFAULT 'UNCLASSIFIED' NOT NULL,
	"classification_confidence" integer DEFAULT 0,
	"classified_at" timestamp,
	"classified_by" varchar,
	"priority" varchar DEFAULT 'WARM',
	"priority_score" integer DEFAULT 50 NOT NULL,
	"current_bucket" varchar DEFAULT 'UNIVERSAL_INBOX',
	"response_text" text,
	"phone_number" varchar,
	"is_read" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"requires_review" boolean DEFAULT false,
	"is_processed" boolean DEFAULT false,
	"sentiment" varchar,
	"intent" varchar,
	"suggested_action" text,
	"ai_notes" text,
	"processed_at" timestamp,
	"processed_by" varchar,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "response_buckets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"type" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"color" varchar DEFAULT '#6366f1',
	"icon" varchar DEFAULT 'inbox',
	"position" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false,
	"auto_move_rules" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "suppression_list" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"phone_number" varchar NOT NULL,
	"type" varchar NOT NULL,
	"reason" text,
	"source_inbox_item_id" varchar(36),
	"confirmed_at" timestamp,
	"confirmed_by" varchar,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_initial_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"initial_message_id" varchar(36) NOT NULL,
	"assigned_sdr_id" varchar(36),
	"position" integer DEFAULT 0 NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"response_count" integer DEFAULT 0 NOT NULL,
	"positive_response_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "initial_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"category" varchar NOT NULL,
	"tone" varchar DEFAULT 'PROFESSIONAL' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"default_sdr_id" varchar(36),
	"times_used" integer DEFAULT 0 NOT NULL,
	"response_rate" integer DEFAULT 0,
	"positive_response_rate" integer DEFAULT 0,
	"avg_response_time" integer,
	"available_tokens" text[] DEFAULT '{"{{firstName}}","{{lastName}}","{{propertyAddress}}","{{city}}","{{equity}}"}',
	"is_variant" boolean DEFAULT false,
	"parent_message_id" varchar(36),
	"variant_name" varchar,
	"is_active" boolean DEFAULT true,
	"is_archived" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sdr_campaign_configs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"sdr_id" varchar(36) NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"auto_respond_to_positive" boolean DEFAULT true,
	"auto_respond_to_neutral" boolean DEFAULT false,
	"escalate_negative" boolean DEFAULT true,
	"min_response_delay_seconds" integer DEFAULT 30,
	"max_response_delay_seconds" integer DEFAULT 300,
	"active_hours_start" varchar DEFAULT '09:00',
	"active_hours_end" varchar DEFAULT '18:00',
	"active_days" text[] DEFAULT '{"MON","TUE","WED","THU","FRI"}',
	"timezone" varchar DEFAULT 'America/New_York',
	"use_lead_first_name" boolean DEFAULT true,
	"signature_style" varchar DEFAULT 'FRIENDLY',
	"max_daily_responses" integer DEFAULT 100,
	"max_responses_per_lead" integer DEFAULT 10,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "property_search_blocks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"search_id" varchar(36) NOT NULL,
	"block_index" integer NOT NULL,
	"key" varchar NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"checksum" varchar,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "property_searches" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"source" varchar NOT NULL,
	"endpoint" varchar NOT NULL,
	"filters" jsonb,
	"filter_hash" varchar(64) NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"block_keys" text[],
	"status" varchar DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "outreach_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"channel" varchar NOT NULL,
	"direction" varchar NOT NULL,
	"worker_name" varchar,
	"content" text,
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sdr_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"status" varchar DEFAULT 'active',
	"current_goal" varchar,
	"context" jsonb,
	"last_interaction_at" timestamp DEFAULT now(),
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_merge_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"survivor_id" varchar(36) NOT NULL,
	"merged_id" varchar NOT NULL,
	"match_score" real NOT NULL,
	"match_details" jsonb,
	"merged_by" varchar,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"middle_name" varchar,
	"suffix" varchar,
	"full_name" varchar NOT NULL,
	"normalized_first_name" varchar NOT NULL,
	"normalized_last_name" varchar NOT NULL,
	"age" integer,
	"date_of_birth" varchar,
	"gender" varchar,
	"confidence_score" real DEFAULT 1 NOT NULL,
	"merged_from_ids" text[] DEFAULT '{}',
	"primary_source" varchar NOT NULL,
	"skip_trace_completed" boolean DEFAULT false NOT NULL,
	"skip_trace_completed_at" timestamp,
	"apollo_completed" boolean DEFAULT false NOT NULL,
	"apollo_completed_at" timestamp,
	"last_enriched_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "persona_phones" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"phone_number" varchar NOT NULL,
	"normalized_number" varchar NOT NULL,
	"phone_type" varchar DEFAULT 'unknown' NOT NULL,
	"carrier" varchar,
	"line_type" varchar,
	"is_valid" boolean DEFAULT true NOT NULL,
	"is_connected" boolean,
	"is_do_not_call" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source" varchar NOT NULL,
	"score" real DEFAULT 0.5 NOT NULL,
	"last_verified_at" timestamp,
	"verification_source" varchar,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "persona_socials" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"platform" varchar NOT NULL,
	"profile_url" varchar NOT NULL,
	"username" varchar,
	"display_name" varchar,
	"headline" varchar,
	"bio" varchar,
	"follower_count" varchar,
	"connection_count" varchar,
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_active_date" timestamp,
	"source" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "skiptrace_jobs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"job_id" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"total_requests" varchar,
	"completed_requests" varchar,
	"failed_requests" varchar,
	"started_at" timestamp,
	"completed_at" timestamp,
	"estimated_completion_time" timestamp,
	"error_message" varchar,
	"provider" varchar DEFAULT 'realestateapi' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "skiptrace_results" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36),
	"request_id" varchar,
	"source_type" varchar NOT NULL,
	"source_id" varchar NOT NULL,
	"input_first_name" varchar,
	"input_last_name" varchar,
	"input_address" varchar,
	"input_city" varchar,
	"input_state" varchar,
	"input_zip" varchar,
	"input_email" varchar,
	"input_phone" varchar,
	"success" boolean DEFAULT false NOT NULL,
	"error_code" varchar,
	"error_message" varchar,
	"match_confidence" real,
	"raw_response" jsonb,
	"phones_found" varchar,
	"emails_found" varchar,
	"addresses_found" varchar,
	"socials_found" varchar,
	"relatives_found" varchar,
	"processed_at" timestamp,
	"provider" varchar DEFAULT 'realestateapi' NOT NULL,
	"credits_cost" real,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "property_owners" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"property_id" varchar(36) NOT NULL,
	"ownership_type" varchar DEFAULT 'individual' NOT NULL,
	"ownership_percent" real,
	"is_primary_owner" boolean DEFAULT true NOT NULL,
	"owner_number" integer DEFAULT 1 NOT NULL,
	"relation_to_property" varchar,
	"mailing_address_same_as_property" boolean DEFAULT true NOT NULL,
	"mailing_street" varchar,
	"mailing_city" varchar,
	"mailing_state" varchar,
	"mailing_zip" varchar,
	"acquisition_date" timestamp,
	"acquisition_price" integer,
	"acquisition_type" varchar,
	"is_current_owner" boolean DEFAULT true NOT NULL,
	"sold_date" timestamp,
	"sold_price" integer,
	"source" varchar NOT NULL,
	"match_confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_queue" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_card_id" varchar(36) NOT NULL,
	"agent" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"template_id" varchar,
	"template_override" text,
	"scheduled_at" timestamp,
	"process_after" timestamp,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_attempt_at" timestamp,
	"last_error" varchar,
	"sent_at" timestamp,
	"external_id" varchar,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_card_id" varchar(36) NOT NULL,
	"activity_type" varchar NOT NULL,
	"agent" varchar,
	"channel" varchar,
	"subject" varchar,
	"content" text,
	"metadata" jsonb,
	"external_id" varchar,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unified_lead_cards" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"persona_id" varchar(36) NOT NULL,
	"business_id" varchar(36),
	"property_id" varchar(36),
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"full_name" varchar NOT NULL,
	"primary_phone" varchar,
	"primary_phone_type" varchar,
	"primary_email" varchar,
	"primary_email_type" varchar,
	"city" varchar,
	"state" varchar,
	"zip" varchar,
	"title" varchar,
	"role_type" varchar DEFAULT 'unknown' NOT NULL,
	"is_decision_maker" boolean DEFAULT false NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"data_quality_score" integer DEFAULT 0 NOT NULL,
	"contact_reachability_score" integer DEFAULT 0 NOT NULL,
	"role_value_score" integer DEFAULT 0 NOT NULL,
	"property_opportunity_score" integer DEFAULT 0 NOT NULL,
	"business_fit_score" integer DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb,
	"assigned_agent" varchar,
	"assigned_channel" varchar,
	"assigned_priority" varchar,
	"campaign_template_id" varchar,
	"campaign_reason" varchar,
	"assigned_at" timestamp,
	"status" varchar DEFAULT 'new' NOT NULL,
	"status_changed_at" timestamp,
	"enrichment_status" varchar DEFAULT 'pending' NOT NULL,
	"skip_trace_status" varchar DEFAULT 'pending' NOT NULL,
	"apollo_status" varchar DEFAULT 'pending' NOT NULL,
	"property_detail_status" varchar DEFAULT 'skipped' NOT NULL,
	"enrichment_error_count" integer DEFAULT 0 NOT NULL,
	"last_enrichment_error" varchar,
	"last_activity_at" timestamp,
	"last_contacted_at" timestamp,
	"last_response_at" timestamp,
	"contact_attempts" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"notes" text,
	"sources" text[] DEFAULT '{}' NOT NULL,
	"primary_source" varchar NOT NULL,
	"raw_data_paths" text[],
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cadence_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"created_by_id" varchar(36),
	"name" varchar NOT NULL,
	"description" text,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"default_worker_id" varchar DEFAULT 'gianna',
	"default_timezone" varchar DEFAULT 'America/New_York',
	"respect_business_hours" boolean DEFAULT true,
	"business_hours_start" varchar DEFAULT '09:00',
	"business_hours_end" varchar DEFAULT '17:00',
	"business_days" text[] DEFAULT '{"Mon","Tue","Wed","Thu","Fri"}',
	"times_used" integer DEFAULT 0,
	"avg_response_rate" integer,
	"is_active" boolean DEFAULT true,
	"is_system" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "intelligence_metrics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"period_type" varchar DEFAULT 'daily',
	"total_outreach" integer DEFAULT 0,
	"total_responses" integer DEFAULT 0,
	"total_conversations" integer DEFAULT 0,
	"total_appointments" integer DEFAULT 0,
	"positive_responses" integer DEFAULT 0,
	"negative_responses" integer DEFAULT 0,
	"neutral_responses" integer DEFAULT 0,
	"opt_outs" integer DEFAULT 0,
	"response_rate" integer,
	"positive_rate" integer,
	"appointment_rate" integer,
	"opt_out_rate" integer,
	"ai_handled_count" integer DEFAULT 0,
	"human_handled_count" integer DEFAULT 0,
	"ai_accuracy" integer,
	"new_patterns_discovered" integer DEFAULT 0,
	"objection_types_encountered" jsonb,
	"best_performing_templates" jsonb,
	"worst_performing_templates" jsonb,
	"intelligence_score" integer DEFAULT 0,
	"score_change" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "worker_personalities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"created_by_id" varchar(36),
	"worker_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"role" varchar NOT NULL,
	"description" text,
	"warmth" integer DEFAULT 70,
	"directness" integer DEFAULT 60,
	"humor" integer DEFAULT 40,
	"formality" integer DEFAULT 30,
	"urgency" integer DEFAULT 50,
	"nudging" integer DEFAULT 60,
	"assertiveness" integer DEFAULT 65,
	"empathy" integer DEFAULT 70,
	"curiosity" integer DEFAULT 60,
	"closing_push" integer DEFAULT 55,
	"voice_style" varchar DEFAULT 'conversational-professional',
	"greeting" varchar DEFAULT 'Hey',
	"sign_off" varchar DEFAULT 'Best',
	"principles" text[] DEFAULT '{}',
	"never_do" text[] DEFAULT '{}',
	"industry" varchar,
	"target_audience" varchar,
	"preset_name" varchar,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shared_link_views" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"shared_link_id" varchar(36) NOT NULL,
	"viewer_id" varchar(36),
	"viewer_email" varchar,
	"viewer_ip" varchar,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_links" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"created_by" varchar(36),
	"resource_type" varchar NOT NULL,
	"resource_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"allowed_emails" text[],
	"allowed_user_ids" text[],
	"is_public" boolean DEFAULT false NOT NULL,
	"require_auth" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp,
	"last_viewed_by" varchar(36),
	"snapshot_data" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "shared_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "worker_phone_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"worker_id" varchar NOT NULL,
	"worker_name" varchar NOT NULL,
	"phone_number" varchar NOT NULL,
	"signalhouse_subgroup_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "achievement_notifications" ADD CONSTRAINT "achievement_notifications_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_notifications" ADD CONSTRAINT "achievement_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_notifications" ADD CONSTRAINT "achievement_notifications_achievement_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_addresses" ADD CONSTRAINT "persona_addresses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_addresses" ADD CONSTRAINT "persona_addresses_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_setter_id_users_id_fk" FOREIGN KEY ("setter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_closer_id_users_id_fk" FOREIGN KEY ("closer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_owners" ADD CONSTRAINT "business_owners_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_owners" ADD CONSTRAINT "business_owners_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_owners" ADD CONSTRAINT "business_owners_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_plays" ADD CONSTRAINT "automation_plays_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_plays" ADD CONSTRAINT "automation_plays_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_cadences" ADD CONSTRAINT "campaign_cadences_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_cadences" ADD CONSTRAINT "campaign_cadences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_labels" ADD CONSTRAINT "conversation_labels_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_log" ADD CONSTRAINT "intelligence_log_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_log" ADD CONSTRAINT "intelligence_log_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_log" ADD CONSTRAINT "intelligence_log_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_labels" ADD CONSTRAINT "lead_labels_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_labels" ADD CONSTRAINT "lead_labels_label_id_conversation_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."conversation_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_labels" ADD CONSTRAINT "lead_labels_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_worker_personality_id_worker_personalities_id_fk" FOREIGN KEY ("worker_personality_id") REFERENCES "public"."worker_personalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_voice_configs" ADD CONSTRAINT "worker_voice_configs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_category_id_content_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."content_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_usage_logs" ADD CONSTRAINT "content_usage_logs_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_usage_logs" ADD CONSTRAINT "content_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_usage_logs" ADD CONSTRAINT "content_usage_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_demographics" ADD CONSTRAINT "persona_demographics_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_demographics" ADD CONSTRAINT "persona_demographics_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_emails" ADD CONSTRAINT "persona_emails_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_emails" ADD CONSTRAINT "persona_emails_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bucket_movements" ADD CONSTRAINT "bucket_movements_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bucket_movements" ADD CONSTRAINT "bucket_movements_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_assigned_sdr_id_ai_sdr_avatars_id_fk" FOREIGN KEY ("assigned_sdr_id") REFERENCES "public"."ai_sdr_avatars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_buckets" ADD CONSTRAINT "response_buckets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_list" ADD CONSTRAINT "suppression_list_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_initial_messages" ADD CONSTRAINT "campaign_initial_messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_initial_messages" ADD CONSTRAINT "campaign_initial_messages_initial_message_id_initial_messages_id_fk" FOREIGN KEY ("initial_message_id") REFERENCES "public"."initial_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_initial_messages" ADD CONSTRAINT "campaign_initial_messages_assigned_sdr_id_ai_sdr_avatars_id_fk" FOREIGN KEY ("assigned_sdr_id") REFERENCES "public"."ai_sdr_avatars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initial_messages" ADD CONSTRAINT "initial_messages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initial_messages" ADD CONSTRAINT "initial_messages_default_sdr_id_ai_sdr_avatars_id_fk" FOREIGN KEY ("default_sdr_id") REFERENCES "public"."ai_sdr_avatars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdr_campaign_configs" ADD CONSTRAINT "sdr_campaign_configs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdr_campaign_configs" ADD CONSTRAINT "sdr_campaign_configs_sdr_id_ai_sdr_avatars_id_fk" FOREIGN KEY ("sdr_id") REFERENCES "public"."ai_sdr_avatars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdr_campaign_configs" ADD CONSTRAINT "sdr_campaign_configs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_search_blocks" ADD CONSTRAINT "property_search_blocks_search_id_property_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."property_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdr_sessions" ADD CONSTRAINT "sdr_sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdr_sessions" ADD CONSTRAINT "sdr_sessions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_merge_history" ADD CONSTRAINT "persona_merge_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_merge_history" ADD CONSTRAINT "persona_merge_history_survivor_id_personas_id_fk" FOREIGN KEY ("survivor_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_phones" ADD CONSTRAINT "persona_phones_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_phones" ADD CONSTRAINT "persona_phones_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_socials" ADD CONSTRAINT "persona_socials_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_socials" ADD CONSTRAINT "persona_socials_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skiptrace_jobs" ADD CONSTRAINT "skiptrace_jobs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skiptrace_results" ADD CONSTRAINT "skiptrace_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skiptrace_results" ADD CONSTRAINT "skiptrace_results_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_queue" ADD CONSTRAINT "campaign_queue_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_queue" ADD CONSTRAINT "campaign_queue_lead_card_id_unified_lead_cards_id_fk" FOREIGN KEY ("lead_card_id") REFERENCES "public"."unified_lead_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_card_id_unified_lead_cards_id_fk" FOREIGN KEY ("lead_card_id") REFERENCES "public"."unified_lead_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_lead_cards" ADD CONSTRAINT "unified_lead_cards_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_lead_cards" ADD CONSTRAINT "unified_lead_cards_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_lead_cards" ADD CONSTRAINT "unified_lead_cards_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_lead_cards" ADD CONSTRAINT "unified_lead_cards_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_templates" ADD CONSTRAINT "cadence_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_templates" ADD CONSTRAINT "cadence_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_metrics" ADD CONSTRAINT "intelligence_metrics_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_personalities" ADD CONSTRAINT "worker_personalities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_personalities" ADD CONSTRAINT "worker_personalities_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_link_views" ADD CONSTRAINT "shared_link_views_shared_link_id_shared_links_id_fk" FOREIGN KEY ("shared_link_id") REFERENCES "public"."shared_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_link_views" ADD CONSTRAINT "shared_link_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_last_viewed_by_users_id_fk" FOREIGN KEY ("last_viewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_phone_assignments" ADD CONSTRAINT "worker_phone_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievement_notifications_user_id_index" ON "achievement_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "achievement_notifications_is_displayed_index" ON "achievement_notifications" USING btree ("is_displayed");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_team_id_index" ON "leaderboard_snapshots" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_period_index" ON "leaderboard_snapshots" USING btree ("period");--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_index" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievements_team_id_index" ON "user_achievements" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "user_achievements_achievement_id_index" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "user_stats_user_id_index" ON "user_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_stats_team_id_index" ON "user_stats" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_addresses_team_id_index" ON "persona_addresses" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_addresses_persona_id_index" ON "persona_addresses" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_addresses_zip_index" ON "persona_addresses" USING btree ("zip");--> statement-breakpoint
CREATE INDEX "persona_addresses_state_index" ON "persona_addresses" USING btree ("state");--> statement-breakpoint
CREATE INDEX "persona_addresses_is_current_index" ON "persona_addresses" USING btree ("is_current");--> statement-breakpoint
CREATE INDEX "persona_addresses_address_type_index" ON "persona_addresses" USING btree ("address_type");--> statement-breakpoint
CREATE INDEX "business_owners_team_id_index" ON "business_owners" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "business_owners_persona_id_index" ON "business_owners" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "business_owners_business_id_index" ON "business_owners" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_owners_persona_id_business_id_index" ON "business_owners" USING btree ("persona_id","business_id");--> statement-breakpoint
CREATE INDEX "business_owners_role_type_index" ON "business_owners" USING btree ("role_type");--> statement-breakpoint
CREATE INDEX "business_owners_is_decision_maker_index" ON "business_owners" USING btree ("is_decision_maker");--> statement-breakpoint
CREATE INDEX "business_owners_is_current_index" ON "business_owners" USING btree ("is_current");--> statement-breakpoint
CREATE INDEX "businesses_team_id_index" ON "businesses" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "businesses_normalized_name_index" ON "businesses" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "businesses_sic_code_index" ON "businesses" USING btree ("sic_code");--> statement-breakpoint
CREATE INDEX "businesses_sector_index" ON "businesses" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "businesses_state_index" ON "businesses" USING btree ("state");--> statement-breakpoint
CREATE INDEX "businesses_zip_index" ON "businesses" USING btree ("zip");--> statement-breakpoint
CREATE INDEX "plays_team_idx" ON "automation_plays" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "plays_trigger_idx" ON "automation_plays" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "plays_active_idx" ON "automation_plays" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cadences_team_idx" ON "campaign_cadences" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "cadences_campaign_idx" ON "campaign_cadences" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "labels_team_idx" ON "conversation_labels" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "labels_slug_idx" ON "conversation_labels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "intel_team_idx" ON "intelligence_log" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "intel_event_idx" ON "intelligence_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "intel_outcome_idx" ON "intelligence_log" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "intel_worker_idx" ON "intelligence_log" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_team_idx" ON "knowledge_documents" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_type_idx" ON "knowledge_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "knowledge_documents_category_idx" ON "knowledge_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "lead_labels_lead_idx" ON "lead_labels" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_labels_label_idx" ON "lead_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "scheduled_events_team_idx" ON "scheduled_events" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "scheduled_events_campaign_idx" ON "scheduled_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "scheduled_events_lead_idx" ON "scheduled_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "scheduled_events_scheduled_at_idx" ON "scheduled_events" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "scheduled_events_status_idx" ON "scheduled_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scheduled_events_type_idx" ON "scheduled_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "worker_voice_team_idx" ON "worker_voice_configs" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "worker_voice_worker_idx" ON "worker_voice_configs" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "content_categories_team_id_idx" ON "content_categories" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "content_categories_parent_id_idx" ON "content_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "content_categories_slug_idx" ON "content_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_items_team_id_idx" ON "content_items" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "content_items_category_id_idx" ON "content_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_items_content_type_idx" ON "content_items" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "content_items_created_by_id_idx" ON "content_items" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "content_items_is_active_idx" ON "content_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "content_usage_logs_content_item_id_idx" ON "content_usage_logs" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "content_usage_logs_user_id_idx" ON "content_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "content_usage_logs_team_id_idx" ON "content_usage_logs" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_demographics_team_id_index" ON "persona_demographics" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_demographics_persona_id_index" ON "persona_demographics" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_demographics_home_owner_status_index" ON "persona_demographics" USING btree ("home_owner_status");--> statement-breakpoint
CREATE INDEX "persona_demographics_income_range_index" ON "persona_demographics" USING btree ("income_range");--> statement-breakpoint
CREATE INDEX "persona_emails_team_id_index" ON "persona_emails" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_emails_persona_id_index" ON "persona_emails" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_emails_normalized_address_index" ON "persona_emails" USING btree ("normalized_address");--> statement-breakpoint
CREATE UNIQUE INDEX "persona_emails_persona_id_normalized_address_index" ON "persona_emails" USING btree ("persona_id","normalized_address");--> statement-breakpoint
CREATE INDEX "persona_emails_email_type_index" ON "persona_emails" USING btree ("email_type");--> statement-breakpoint
CREATE INDEX "persona_emails_is_unsubscribed_index" ON "persona_emails" USING btree ("is_unsubscribed");--> statement-breakpoint
CREATE INDEX "persona_emails_domain_index" ON "persona_emails" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "bucket_movements_inbox_item_id_index" ON "bucket_movements" USING btree ("inbox_item_id");--> statement-breakpoint
CREATE INDEX "bucket_movements_team_id_index" ON "bucket_movements" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "inbox_items_team_id_index" ON "inbox_items" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "inbox_items_lead_id_index" ON "inbox_items" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "inbox_items_current_bucket_index" ON "inbox_items" USING btree ("current_bucket");--> statement-breakpoint
CREATE INDEX "inbox_items_priority_index" ON "inbox_items" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "inbox_items_classification_index" ON "inbox_items" USING btree ("classification");--> statement-breakpoint
CREATE INDEX "inbox_items_is_processed_index" ON "inbox_items" USING btree ("is_processed");--> statement-breakpoint
CREATE INDEX "suppression_list_team_id_index" ON "suppression_list" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "suppression_list_phone_number_index" ON "suppression_list" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "suppression_list_type_index" ON "suppression_list" USING btree ("type");--> statement-breakpoint
CREATE INDEX "campaign_initial_messages_campaign_id_index" ON "campaign_initial_messages" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_initial_messages_initial_message_id_index" ON "campaign_initial_messages" USING btree ("initial_message_id");--> statement-breakpoint
CREATE INDEX "campaign_initial_messages_assigned_sdr_id_index" ON "campaign_initial_messages" USING btree ("assigned_sdr_id");--> statement-breakpoint
CREATE INDEX "initial_messages_team_id_index" ON "initial_messages" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "initial_messages_category_index" ON "initial_messages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "initial_messages_default_sdr_id_index" ON "initial_messages" USING btree ("default_sdr_id");--> statement-breakpoint
CREATE INDEX "initial_messages_is_active_index" ON "initial_messages" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sdr_campaign_configs_sdr_id_index" ON "sdr_campaign_configs" USING btree ("sdr_id");--> statement-breakpoint
CREATE INDEX "sdr_campaign_configs_campaign_id_index" ON "sdr_campaign_configs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "sdr_campaign_configs_team_id_index" ON "sdr_campaign_configs" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_search_blocks_search_id_block_index_index" ON "property_search_blocks" USING btree ("search_id","block_index");--> statement-breakpoint
CREATE INDEX "property_search_blocks_search_id_index" ON "property_search_blocks" USING btree ("search_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_searches_source_endpoint_filter_hash_index" ON "property_searches" USING btree ("source","endpoint","filter_hash");--> statement-breakpoint
CREATE INDEX "property_searches_created_at_index" ON "property_searches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "persona_merge_history_team_id_index" ON "persona_merge_history" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_merge_history_survivor_id_index" ON "persona_merge_history" USING btree ("survivor_id");--> statement-breakpoint
CREATE INDEX "personas_team_id_index" ON "personas" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "personas_normalized_first_name_normalized_last_name_index" ON "personas" USING btree ("normalized_first_name","normalized_last_name");--> statement-breakpoint
CREATE INDEX "personas_primary_source_index" ON "personas" USING btree ("primary_source");--> statement-breakpoint
CREATE INDEX "personas_skip_trace_completed_index" ON "personas" USING btree ("skip_trace_completed");--> statement-breakpoint
CREATE INDEX "personas_apollo_completed_index" ON "personas" USING btree ("apollo_completed");--> statement-breakpoint
CREATE INDEX "persona_phones_team_id_index" ON "persona_phones" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_phones_persona_id_index" ON "persona_phones" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_phones_normalized_number_index" ON "persona_phones" USING btree ("normalized_number");--> statement-breakpoint
CREATE UNIQUE INDEX "persona_phones_persona_id_normalized_number_index" ON "persona_phones" USING btree ("persona_id","normalized_number");--> statement-breakpoint
CREATE INDEX "persona_phones_phone_type_index" ON "persona_phones" USING btree ("phone_type");--> statement-breakpoint
CREATE INDEX "persona_phones_is_do_not_call_index" ON "persona_phones" USING btree ("is_do_not_call");--> statement-breakpoint
CREATE INDEX "persona_socials_team_id_index" ON "persona_socials" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "persona_socials_persona_id_index" ON "persona_socials" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_socials_platform_index" ON "persona_socials" USING btree ("platform");--> statement-breakpoint
CREATE UNIQUE INDEX "persona_socials_persona_id_platform_profile_url_index" ON "persona_socials" USING btree ("persona_id","platform","profile_url");--> statement-breakpoint
CREATE INDEX "skiptrace_jobs_team_id_index" ON "skiptrace_jobs" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "skiptrace_jobs_status_index" ON "skiptrace_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "skiptrace_jobs_job_id_index" ON "skiptrace_jobs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "skiptrace_results_team_id_index" ON "skiptrace_results" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "skiptrace_results_persona_id_index" ON "skiptrace_results" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "skiptrace_results_source_type_source_id_index" ON "skiptrace_results" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "skiptrace_results_success_index" ON "skiptrace_results" USING btree ("success");--> statement-breakpoint
CREATE INDEX "skiptrace_results_created_at_index" ON "skiptrace_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "property_owners_team_id_index" ON "property_owners" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "property_owners_persona_id_index" ON "property_owners" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "property_owners_property_id_index" ON "property_owners" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_owners_persona_id_property_id_index" ON "property_owners" USING btree ("persona_id","property_id");--> statement-breakpoint
CREATE INDEX "property_owners_is_current_owner_index" ON "property_owners" USING btree ("is_current_owner");--> statement-breakpoint
CREATE INDEX "property_owners_ownership_type_index" ON "property_owners" USING btree ("ownership_type");--> statement-breakpoint
CREATE INDEX "campaign_queue_team_id_index" ON "campaign_queue" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "campaign_queue_lead_card_id_index" ON "campaign_queue" USING btree ("lead_card_id");--> statement-breakpoint
CREATE INDEX "campaign_queue_status_index" ON "campaign_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_queue_agent_index" ON "campaign_queue" USING btree ("agent");--> statement-breakpoint
CREATE INDEX "campaign_queue_priority_index" ON "campaign_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "campaign_queue_scheduled_at_index" ON "campaign_queue" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "campaign_queue_process_after_index" ON "campaign_queue" USING btree ("process_after");--> statement-breakpoint
CREATE INDEX "lead_activities_team_id_index" ON "lead_activities" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "lead_activities_lead_card_id_index" ON "lead_activities" USING btree ("lead_card_id");--> statement-breakpoint
CREATE INDEX "lead_activities_activity_type_index" ON "lead_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "lead_activities_created_at_index" ON "lead_activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_team_id_index" ON "unified_lead_cards" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_persona_id_index" ON "unified_lead_cards" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_business_id_index" ON "unified_lead_cards" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_property_id_index" ON "unified_lead_cards" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_total_score_index" ON "unified_lead_cards" USING btree ("total_score");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_status_index" ON "unified_lead_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_assigned_agent_index" ON "unified_lead_cards" USING btree ("assigned_agent");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_assigned_priority_index" ON "unified_lead_cards" USING btree ("assigned_priority");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_enrichment_status_index" ON "unified_lead_cards" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_role_type_index" ON "unified_lead_cards" USING btree ("role_type");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_is_decision_maker_index" ON "unified_lead_cards" USING btree ("is_decision_maker");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_created_at_index" ON "unified_lead_cards" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "unified_lead_cards_last_activity_at_index" ON "unified_lead_cards" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "cadence_templates_team_idx" ON "cadence_templates" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "cadence_templates_active_idx" ON "cadence_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "intelligence_metrics_team_idx" ON "intelligence_metrics" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "intelligence_metrics_period_idx" ON "intelligence_metrics" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "worker_personalities_team_idx" ON "worker_personalities" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "worker_personalities_worker_idx" ON "worker_personalities" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "shared_link_views_link_idx" ON "shared_link_views" USING btree ("shared_link_id");--> statement-breakpoint
CREATE INDEX "shared_link_views_viewer_idx" ON "shared_link_views" USING btree ("viewer_id");--> statement-breakpoint
CREATE INDEX "shared_links_team_idx" ON "shared_links" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "shared_links_token_idx" ON "shared_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "shared_links_resource_idx" ON "shared_links" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "shared_links_created_by_idx" ON "shared_links" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "worker_phone_assignments_team_id_index" ON "worker_phone_assignments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "worker_phone_assignments_worker_id_index" ON "worker_phone_assignments" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "worker_phone_assignments_phone_number_index" ON "worker_phone_assignments" USING btree ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_phone_assignments_team_id_worker_id_index" ON "worker_phone_assignments" USING btree ("team_id","worker_id");--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "description";