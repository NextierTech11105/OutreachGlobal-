import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="border rounded-md">
          <div className="p-4 border-b">
            <div className="grid grid-cols-6 gap-4">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
            </div>
          </div>
          <div className="p-1">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="p-3 border-b last:border-0">
                  <div className="grid grid-cols-6 gap-4">
                    {Array(6)
                      .fill(0)
                      .map((_, j) => (
                        <Skeleton key={j} className="h-10" />
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
