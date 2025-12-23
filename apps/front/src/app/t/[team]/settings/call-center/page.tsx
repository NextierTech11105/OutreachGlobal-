import { TwilioIntegration } from "@/features/twilio/components/twilio-integration";
import { TwilioTestVoice } from "@/features/twilio/components/twilio-test-voice";

export default function CallCenterSettingsPage() {
  return (
    <div className="space-y-6">
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

      {/* Voice Test Component */}
      <TwilioTestVoice />
    </div>
  );
}
