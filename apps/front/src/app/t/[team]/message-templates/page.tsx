import { getTitle } from "@/config/title";
import { MessageTemplateList } from "@/features/message-template/components/message-template-list";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: getTitle("Message Templates"),
};

export default function MessageTemplatesPage() {
  return (
    <TeamSection>
      <TeamHeader title="Message Templates" />

      <div className="container space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <TeamTitle>Message Templates</TeamTitle>
            <TeamDescription>
              Manage reusable message templates for email, SMS, and voice
              campaigns
            </TeamDescription>
          </div>
        </div>
        <MessageTemplateList />
      </div>
    </TeamSection>
  );
}
