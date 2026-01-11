"use client";

import { BarChart3 } from "lucide-react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";
import { SMSAnalyticsDashboard } from "@/components/sms/sms-analytics-dashboard";

export default function SMSAnalyticsPage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();

  return (
    <TeamSection className="h-full flex flex-col">
      <TeamHeader>
        <TeamTitle>
          <BarChart3 className="w-6 h-6 mr-2" />
          SMS Analytics
        </TeamTitle>
      </TeamHeader>

      <div className="flex-1 p-4 min-h-0 overflow-auto">
        <SMSAnalyticsDashboard teamId={teamId} />
      </div>
    </TeamSection>
  );
}
