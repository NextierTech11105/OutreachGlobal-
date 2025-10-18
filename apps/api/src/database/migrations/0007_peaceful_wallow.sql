CREATE TABLE "prompts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"category" varchar NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;