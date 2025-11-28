import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { SendgridIntegration } from "@/features/sendgrid/components/sendgrid-integration";

export default function SendgridIntegrationPage() {
  return (
    <TeamSection>
      <TeamHeader title="SendGrid Settings" />

      <div className="container">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            SendGrid Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure SendGrid settings for email capabilities
          </p>
        </div>

        <SendgridIntegration />
      </div>
    </TeamSection>
  );
}
