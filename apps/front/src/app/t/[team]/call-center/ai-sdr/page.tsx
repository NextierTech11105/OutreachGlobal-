import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { AiSdrManager } from "@/components/ai-sdr-manager";

export default function AiSdrPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">AI SDR Manager</h2>
          <p className="text-muted-foreground">
            Configure and monitor your AI-powered sales development
            representatives
          </p>
        </div>
        <DashboardShell>
          <AiSdrManager />
        </DashboardShell>
      </div>
    </div>
  );
}
