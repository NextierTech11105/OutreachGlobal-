import { getTitle } from "@/config/title";
import { AiSdrForm } from "@/features/sdr/components/ai-sdr-form";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("Create AI SDR Avatar"),
};

export default function Page() {
  return (
    <TeamSection>
      <TeamHeader
        title="Create"
        links={[
          {
            title: "AI SDR Avatars",
            href: "/ai-sdr",
          },
        ]}
      />

      <div className="container">
        <AiSdrForm />
      </div>
    </TeamSection>
  );
}
