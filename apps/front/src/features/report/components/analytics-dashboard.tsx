"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamDashboardReport } from "./team-dashboard-report";
import { CampaignPerformanceTable } from "./campaign-performance-table";
import { useCurrentTeam } from "@/features/team/team.context";
import { CAMPAIGNS_QUERY } from "@/features/campaign/queries/campaign.queries";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { useMemo } from "react";

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
        <h3 className="text-lg font-medium">30-Day Rolling Measurement</h3>
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

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <TeamDashboardReport />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CampaignPerformanceTable />
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Detailed performance metrics for all active campaigns
              </CardDescription>
            </CardHeader>
            <CampaignPerformanceTable />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
