import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TwilioIntegration } from "@/features/twilio/components/twilio-integration";

export default function TwilioIntegrationPage() {
  return (
    <TeamSection>
      <TeamHeader title="Twilio Settings" />

      <div className="container">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Twilio Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure Twilio settings for voice and SMS capabilities
          </p>
        </div>

        <TwilioIntegration />
      </div>
    </TeamSection>
  );
}
