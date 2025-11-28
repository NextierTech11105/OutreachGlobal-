"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, CheckCircle, Database, Tag } from "lucide-react";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import { numberFormat } from "@nextier/common";
import { BASIC_TEAM_REPORT_QUERY } from "@/features/team/queries/team-report.queries";
import { useCurrentTeam } from "@/features/team/team.context";

export function TeamDashboardReport() {
  const { team } = useCurrentTeam();
  const [report] = useSingleQuery(BASIC_TEAM_REPORT_QUERY, {
    pick: "teamReport",
    variables: { teamId: team.id },
  });
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leads Verified</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {numberFormat(report?.verifiedLeadsCount ?? 0)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leads Enriched</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {numberFormat(report?.enrichedLeadsCount ?? 0)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            High Score (30+)
          </CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {numberFormat(report?.highScoreLeadsCount ?? 0)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Properties</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {numberFormat(report?.propertiesCount ?? 0)}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
