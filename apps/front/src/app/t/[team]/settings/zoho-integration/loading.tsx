import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export default function ZohoIntegrationLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Zoho CRM Integration</h3>
        <p className="text-sm text-muted-foreground">
          Connect your OutreachGlobal data engine with Zoho CRM for seamless
          data synchronization
        </p>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    </div>
  );
}
