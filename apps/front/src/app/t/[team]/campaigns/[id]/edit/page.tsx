import type { Metadata } from "next";
import { CampaignForm } from "@/features/campaign/components/campaign-form";
import { getTitle } from "@/config/title";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { PageProps } from "@/types/route.type";
import { getCampaignForm } from "@/features/campaign/campaign.data";

export const metadata: Metadata = {
  title: getTitle("Edit Campaign"),
};

export default async function Page({
  params,
}: PageProps<{ id: string; team: string }>) {
  const { team, id } = await params;
  const campaign = await getCampaignForm(id, team);
  return (
    <TeamSection>
      <TeamHeader
        title="Edit Campaign"
        links={[
          {
            title: "Campaigns",
            href: "/campaigns",
          },
        ]}
      />
      <div className="container">
        <div className="mb-4">
          <TeamTitle>Edit Campaign</TeamTitle>
        </div>
        <CampaignForm campaign={campaign} />
      </div>
    </TeamSection>
  );
}
