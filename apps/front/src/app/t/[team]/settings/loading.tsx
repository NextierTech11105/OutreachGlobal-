import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
