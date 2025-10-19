import { TwilioIntegration } from "@/components/twilio-integration";

export default function TwilioIntegrationPage() {
  return (
    <div className="flex flex-col min-h-screen">
      
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Twilio Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure Twilio settings for voice and SMS capabilities
          </p>
        </div>

        <TwilioIntegration />
      </div>
    </div>
  );
}
