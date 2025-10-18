import { Skeleton } from "@/components/ui/skeleton";

export default function DataSchemaLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    </div>
  );
}
