CREATE TABLE "call_histories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"dialer_contact_id" varchar(36) NOT NULL,
	"sid" varchar,
	"dialer_mode" varchar NOT NULL,
	"team_member_id" varchar(36),
	"ai_sdr_avatar_id" varchar(36),
	"disposition" varchar,
	"notes" text,
	"sentiment" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "call_recordings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"call_history_id" varchar(36) NOT NULL,
	"sid" varchar,
	"status" varchar DEFAULT 'UNKNOWN' NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"url" varchar,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dialer_contacts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"power_dialer_id" varchar(36) NOT NULL,
	"lead_id" varchar(36),
	"position" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "power_dialers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"member_id" varchar(36),
	"title" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "call_histories" ADD CONSTRAINT "call_histories_dialer_contact_id_dialer_contacts_id_fk" FOREIGN KEY ("dialer_contact_id") REFERENCES "public"."dialer_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_histories" ADD CONSTRAINT "call_histories_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_histories" ADD CONSTRAINT "call_histories_ai_sdr_avatar_id_ai_sdr_avatars_id_fk" FOREIGN KEY ("ai_sdr_avatar_id") REFERENCES "public"."ai_sdr_avatars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_call_history_id_call_histories_id_fk" FOREIGN KEY ("call_history_id") REFERENCES "public"."call_histories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_contacts" ADD CONSTRAINT "dialer_contacts_power_dialer_id_power_dialers_id_fk" FOREIGN KEY ("power_dialer_id") REFERENCES "public"."power_dialers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialer_contacts" ADD CONSTRAINT "dialer_contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "power_dialers" ADD CONSTRAINT "power_dialers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;