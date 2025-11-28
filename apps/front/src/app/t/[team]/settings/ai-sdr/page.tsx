import { Suspense } from "react";
import { AiSdrManager } from "@/components/ai-sdr-manager";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiSdrPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI SDR Avatars</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI sales development representatives
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <AiSdrManager />
      </Suspense>
    </div>
  );
}
