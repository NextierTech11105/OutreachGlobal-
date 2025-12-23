"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignPerformanceTable } from "./campaign-performance-table";
import { useCurrentTeam } from "@/features/team/team.context";
import { CAMPAIGNS_QUERY } from "@/features/campaign/queries/campaign.queries";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";

export function AnalyticsDashboard() {
  const { team } = useCurrentTeam();

  const [campaigns = [], pageInfo, { loading }] = useConnectionQuery(
    CAMPAIGNS_QUERY,
    {
      pick: "campaigns",
      variables: {
        teamId: team.id,
      },
    },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Campaign Performance</h3>
        <Select defaultValue="30days">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            Detailed performance metrics for all active campaigns
          </CardDescription>
        </CardHeader>
        <CampaignPerformanceTable />
      </Card>
    </div>
  );
}
