import { AiSdrManager } from "@/components/ai-sdr-manager";

export default function AiSdrPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI SDR Avatars</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI sales development representatives
          </p>
        </div>

        <AiSdrManager />
      </div>
    </div>
  );
}
