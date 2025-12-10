"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentTeam } from "@/features/team/team.context";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { Phone, Headphones, Clock, BarChart3 } from "lucide-react";
import { CALL_CENTER_REPORT_QUERY } from "../queries/call-center.queries";
import { formatTime } from "@/lib/utils";

export const CallCenterQuickStats: React.FC = () => {
  const { teamId, isTeamReady } = useCurrentTeam();
  const [report] = useSingleQuery(CALL_CENTER_REPORT_QUERY, {
    pick: "callCenterReport",
    variables: {
      teamId,
    },
    skip: !isTeamReady,
  });

  if (!isTeamReady) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Calls Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{report?.totalCalls}</div>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Success Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {report?.successRate?.toFixed(2)}%
            </div>
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Call Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {formatTime(report?.averageCallDuration ?? 0)}
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            AI SDR Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{report?.aiSdrCalls}</div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
