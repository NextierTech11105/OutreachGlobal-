import { TwilioIntegration } from "@/components/twilio-integration";

export default function CallCenterSettingsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Call Center Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your call center integration and preferences
          </p>
        </div>
      </div>

      <TwilioIntegration />
    </div>
  );
}
