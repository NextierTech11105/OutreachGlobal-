import { Button } from "@/components/ui/button";
import { getTitle } from "@/config/title";
import { AiSdrList } from "@/features/sdr/components/ai-sdr-list";
import { TeamLink } from "@/features/team/components/team-link";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { PlusIcon } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("AI SDR Avatars"),
};

export default function Page() {
  return (
    <TeamSection>
      <TeamHeader title="AI SDR Avatars" />

      <div className="container">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <TeamTitle>AI SDR Avatars</TeamTitle>
            <TeamDescription>
              Manage your AI sales development representatives
            </TeamDescription>
          </div>

          <Button asChild>
            <TeamLink href="/ai-sdr/create">
              <PlusIcon />
              Add New Avatar
            </TeamLink>
          </Button>
        </div>

        <AiSdrList />
      </div>
    </TeamSection>
  );
}
