import { GiannaAgentConfig } from "@/components/gianna-agent-config";

export default function DigitalWorkersPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Replies</h1>
          <p className="text-muted-foreground mt-2">
            Configure GIANNA - your AI-powered outreach assistant backed by real
            personality DNA.
          </p>
        </div>

        <GiannaAgentConfig />
      </div>
    </div>
  );
}
