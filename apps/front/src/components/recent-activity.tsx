import type React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecentActivityProps extends React.HTMLAttributes<HTMLDivElement> {}

export function RecentActivity({ className, ...props }: RecentActivityProps) {
  const activities = [
    {
      action: "Address Verification",
      details: "100 addresses processed",
      time: "2 hours ago",
      status: "success",
    },
    {
      action: "Property Enrichment",
      details: "250 properties enriched",
      time: "5 hours ago",
      status: "success",
    },
    {
      action: "Compound Search",
      details: "Queens County, NY - High Equity",
      time: "1 day ago",
      status: "success",
    },
    {
      action: "Campaign Routing",
      details: "85 leads routed to AI SDR",
      time: "1 day ago",
      status: "success",
    },
    {
      action: "CRM Sync",
      details: "Failed to sync with Zoho CRM",
      time: "2 days ago",
      status: "error",
    },
  ];

  return (
    <Card className={cn("col-span-4", className)} {...props}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Recent operations in the data engine</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activities.map((activity, i) => (
            <div key={i} className="flex items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.action}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.details}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge
                  variant={
                    activity.status === "success" ? "default" : "destructive"
                  }
                >
                  {activity.status === "success" ? "Completed" : "Failed"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
