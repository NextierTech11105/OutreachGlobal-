import { getTitle } from "@/config/title";
import { getAiSdrAvatarDetails } from "@/features/sdr/ai-sdr-avatar.data";
import { AiSdrForm } from "@/features/sdr/components/ai-sdr-form";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { PageProps } from "@/types/route.type";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("Edit AI SDR Avatar"),
};

export default async function Page({
  params,
}: PageProps<{ team: string; id: string }>) {
  const { id, team } = await params;
  const sdr = await getAiSdrAvatarDetails(id, team);

  return (
    <TeamSection>
      <TeamHeader
        title="Edit"
        links={[
          {
            title: "AI SDR Avatars",
            href: "/ai-sdr",
          },
          {
            title: sdr.name,
            href: `/ai-sdr/${id}`,
          },
        ]}
      />

      <div className="container">
        <AiSdrForm avatar={sdr} />
      </div>
    </TeamSection>
  );
}
