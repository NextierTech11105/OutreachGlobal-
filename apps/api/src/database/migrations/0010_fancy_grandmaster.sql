CREATE TABLE "team_invitations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"team_id" varchar(36) NOT NULL,
	"email" varchar NOT NULL,
	"invited_by" varchar(36),
	"role" varchar DEFAULT 'MEMBER' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_invitations_team_id_index" ON "team_invitations" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_team_id_email_index" ON "team_invitations" USING btree ("team_id","email");