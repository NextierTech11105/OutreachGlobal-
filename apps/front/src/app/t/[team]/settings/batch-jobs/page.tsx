import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Batch Jobs",
  description: "Manage and monitor batch processing jobs",
};

export default function BatchJobsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor batch processing jobs
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Batch job management is being developed. This will allow you to
            schedule and monitor large-scale data processing tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current batch operations run automatically through the campaign
            execution system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
