import { getTitle } from "@/config/title";
import { PromptList } from "@/features/prompt/components/prompt-list";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("Prompt Library"),
};

export default function PromptLibraryPage() {
  return (
    <TeamSection>
      <TeamHeader title="Prompt Library" />
      <div className="container">
        <div className="mb-4">
          <TeamTitle>AI Prompt Library</TeamTitle>
          <TeamDescription>
            Manage AI prompts for generating campaign messages
          </TeamDescription>
        </div>

        <PromptList />
      </div>
    </TeamSection>
  );
}
