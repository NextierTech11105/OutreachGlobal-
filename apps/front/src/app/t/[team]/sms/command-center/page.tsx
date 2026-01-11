"use client";

import { MessageSquare } from "lucide-react";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";
import { SMSCommandCenter } from "@/components/sms/sms-command-center";

export default function SMSCommandCenterPage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();

  return (
    <TeamSection className="h-full flex flex-col">
      <TeamHeader>
        <TeamTitle>
          <MessageSquare className="w-6 h-6 mr-2" />
          SMS Command Center
        </TeamTitle>
      </TeamHeader>

      <div className="flex-1 p-4 min-h-0">
        <SMSCommandCenter teamId={teamId} />
      </div>
    </TeamSection>
  );
}
