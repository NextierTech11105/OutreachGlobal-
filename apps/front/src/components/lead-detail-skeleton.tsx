import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LeadDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Lead overview card skeleton */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Contact Information skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Property Information skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Information skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex items-center gap-2 mt-1">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-16" />
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up and Status skeleton */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>

          {/* Notes skeleton */}
          <div className="mt-6">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div>
        <Skeleton className="h-10 w-[600px] rounded-lg mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
