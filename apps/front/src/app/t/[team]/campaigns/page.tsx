import { CampaignDirector } from "@/features/campaign/components/campaign-director";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TeamLink } from "@/features/team/components/team-link";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamDescription } from "@/features/team/layouts/team-description";

export default function CampaignsPage() {
  return (
    <TeamSection>
      <TeamHeader title="Campaigns" />

      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <div>
            <TeamTitle>Campaign Management</TeamTitle>
            <TeamDescription>
              Create, manage, and monitor your outreach campaigns
            </TeamDescription>
          </div>
          <Button asChild>
            <TeamLink href="/campaigns/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </TeamLink>
          </Button>
        </div>

        <CampaignDirector />
      </div>
    </TeamSection>
  );
}
