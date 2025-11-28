import type { Metadata } from "next";
import { CampaignForm } from "@/features/campaign/components/campaign-form";
import { getTitle } from "@/config/title";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamDescription } from "@/features/team/layouts/team-description";

export const metadata: Metadata = {
  title: getTitle("Create Campaign"),
  description: "Create a new campaign to engage with your leads",
};

export default function Page() {
  return (
    <TeamSection>
      <TeamHeader
        title="Create Campaign"
        links={[
          {
            title: "Campaigns",
            href: "/campaigns",
          },
        ]}
      />
      <div className="container">
        <div className="mb-4">
          <TeamTitle>Create Campaign</TeamTitle>
          <TeamDescription>
            Create a new campaign to engage with your leads
          </TeamDescription>
        </div>
        <CampaignForm />
      </div>
    </TeamSection>
  );
}
