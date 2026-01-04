CREATE TABLE "ml_feature_snapshots" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"snapshot_at" timestamp NOT NULL,
	"snapshot_trigger" varchar NOT NULL,
	"features" jsonb NOT NULL,
	"outcome_label" varchar,
	"outcome_at" timestamp,
	"model_version" varchar,
	"campaign_id" varchar,
	"template_id" varchar,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_blocks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"campaign_id" varchar NOT NULL,
	"campaign_name" varchar,
	"block_number" integer DEFAULT 1 NOT NULL,
	"max_leads" integer DEFAULT 2000 NOT NULL,
	"max_touches_per_lead" integer DEFAULT 5 NOT NULL,
	"target_sends" integer DEFAULT 10000 NOT NULL,
	"leads_loaded" integer DEFAULT 0 NOT NULL,
	"total_touches" integer DEFAULT 0 NOT NULL,
	"current_touch" integer DEFAULT 1 NOT NULL,
	"status" varchar DEFAULT 'preparing' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"paused_at" timestamp,
	"pivoted_at" timestamp,
	"pivot_to" varchar,
	"pivot_reason" varchar,
	"metrics" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_touches" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"campaign_block_id" varchar(36) NOT NULL,
	"touch_number" integer NOT NULL,
	"channel" varchar DEFAULT 'sms' NOT NULL,
	"template_id" varchar,
	"message_id" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"replied" integer DEFAULT 0,
	"replied_at" timestamp,
	"reply_intent" varchar,
	"should_pivot" integer DEFAULT 0,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ml_predictions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"model_name" varchar NOT NULL,
	"model_version" varchar NOT NULL,
	"prediction" jsonb NOT NULL,
	"human_action" varchar,
	"human_action_at" timestamp,
	"human_action_by" varchar(36),
	"actual_outcome" varchar,
	"actual_outcome_at" timestamp,
	"campaign_id" varchar,
	"campaign_block_id" varchar,
	"touch_number" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_performance" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"template_id" varchar NOT NULL,
	"template_name" varchar NOT NULL,
	"campaign_id" varchar,
	"campaign_lane" varchar,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"total_delivered" integer DEFAULT 0 NOT NULL,
	"total_failed" integer DEFAULT 0 NOT NULL,
	"total_replied" integer DEFAULT 0 NOT NULL,
	"positive_replies" integer DEFAULT 0 NOT NULL,
	"negative_replies" integer DEFAULT 0 NOT NULL,
	"question_replies" integer DEFAULT 0 NOT NULL,
	"neutral_replies" integer DEFAULT 0 NOT NULL,
	"emails_captured" integer DEFAULT 0 NOT NULL,
	"calls_scheduled" integer DEFAULT 0 NOT NULL,
	"meetings_booked" integer DEFAULT 0 NOT NULL,
	"opt_outs" integer DEFAULT 0 NOT NULL,
	"wrong_numbers" integer DEFAULT 0 NOT NULL,
	"complaints" integer DEFAULT 0 NOT NULL,
	"delivery_rate" numeric(5, 4),
	"reply_rate" numeric(5, 4),
	"positive_rate" numeric(5, 4),
	"conversion_rate" numeric(5, 4),
	"opt_out_rate" numeric(5, 4),
	"composite_score" numeric(5, 2),
	"touch1_sent" integer DEFAULT 0,
	"touch1_replied" integer DEFAULT 0,
	"touch2_sent" integer DEFAULT 0,
	"touch2_replied" integer DEFAULT 0,
	"touch3_sent" integer DEFAULT 0,
	"touch3_replied" integer DEFAULT 0,
	"touch4_sent" integer DEFAULT 0,
	"touch4_replied" integer DEFAULT 0,
	"touch5_sent" integer DEFAULT 0,
	"touch5_replied" integer DEFAULT 0,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "signalhouse_subgroup_id" varchar;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "signalhouse_brand_id" varchar;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "signalhouse_campaign_ids" jsonb;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "signalhouse_phone_pool" jsonb;--> statement-breakpoint
ALTER TABLE "ml_feature_snapshots" ADD CONSTRAINT "ml_feature_snapshots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_feature_snapshots" ADD CONSTRAINT "ml_feature_snapshots_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_blocks" ADD CONSTRAINT "campaign_blocks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_touches" ADD CONSTRAINT "lead_touches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_touches" ADD CONSTRAINT "lead_touches_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_touches" ADD CONSTRAINT "lead_touches_campaign_block_id_campaign_blocks_id_fk" FOREIGN KEY ("campaign_block_id") REFERENCES "public"."campaign_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_performance" ADD CONSTRAINT "template_performance_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ml_feature_snapshots_lead_time_idx" ON "ml_feature_snapshots" USING btree ("lead_id","snapshot_at");--> statement-breakpoint
CREATE INDEX "ml_feature_snapshots_team_idx" ON "ml_feature_snapshots" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "ml_feature_snapshots_trigger_idx" ON "ml_feature_snapshots" USING btree ("snapshot_trigger");--> statement-breakpoint
CREATE INDEX "ml_feature_snapshots_outcome_idx" ON "ml_feature_snapshots" USING btree ("outcome_label");--> statement-breakpoint
CREATE INDEX "ml_feature_snapshots_campaign_idx" ON "ml_feature_snapshots" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_blocks_campaign_block_idx" ON "campaign_blocks" USING btree ("campaign_id","block_number");--> statement-breakpoint
CREATE INDEX "campaign_blocks_team_idx" ON "campaign_blocks" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "campaign_blocks_status_idx" ON "campaign_blocks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_blocks_active_idx" ON "campaign_blocks" USING btree ("team_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_touches_lead_block_touch_idx" ON "lead_touches" USING btree ("lead_id","campaign_block_id","touch_number");--> statement-breakpoint
CREATE INDEX "lead_touches_lead_idx" ON "lead_touches" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_touches_block_idx" ON "lead_touches" USING btree ("campaign_block_id");--> statement-breakpoint
CREATE INDEX "lead_touches_touch_num_idx" ON "lead_touches" USING btree ("campaign_block_id","touch_number");--> statement-breakpoint
CREATE INDEX "lead_touches_pivot_idx" ON "lead_touches" USING btree ("should_pivot");--> statement-breakpoint
CREATE INDEX "ml_predictions_lead_idx" ON "ml_predictions" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "ml_predictions_team_idx" ON "ml_predictions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "ml_predictions_model_idx" ON "ml_predictions" USING btree ("model_name","model_version");--> statement-breakpoint
CREATE INDEX "ml_predictions_outcome_idx" ON "ml_predictions" USING btree ("actual_outcome");--> statement-breakpoint
CREATE INDEX "ml_predictions_block_idx" ON "ml_predictions" USING btree ("campaign_block_id");--> statement-breakpoint
CREATE INDEX "ml_predictions_action_idx" ON "ml_predictions" USING btree ("human_action");--> statement-breakpoint
CREATE UNIQUE INDEX "template_perf_template_period_idx" ON "template_performance" USING btree ("team_id","template_id","period_start");--> statement-breakpoint
CREATE INDEX "template_perf_team_idx" ON "template_performance" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "template_perf_score_idx" ON "template_performance" USING btree ("team_id","composite_score");--> statement-breakpoint
CREATE INDEX "template_perf_campaign_idx" ON "template_performance" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "template_perf_lane_idx" ON "template_performance" USING btree ("campaign_lane");--> statement-breakpoint
CREATE INDEX "teams_signalhouse_idx" ON "teams" USING btree ("signalhouse_subgroup_id");