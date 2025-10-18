import { CampaignDetails } from "@/components/campaign-details";
import { getCampaignDetails } from "@/features/campaign/campaign.data";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { PageProps } from "@/types/route.type";

export default async function CampaignPage({
  params,
}: PageProps<{ team: string; id: string }>) {
  const { team, id } = await params;
  const campaign = await getCampaignDetails(id, team);
  return (
    <TeamSection>
      <TeamHeader
        title="Campaign Details"
        links={[{ title: "Campaigns", href: "/campaigns" }]}
      />
      <div className="container">
        <CampaignDetails campaign={campaign} />
      </div>
    </TeamSection>
  );
}
