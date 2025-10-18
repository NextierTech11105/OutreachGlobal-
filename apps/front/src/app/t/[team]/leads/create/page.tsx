import type { Metadata } from "next";
import { getTitle } from "@/config/title";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { LeadForm } from "@/features/lead/components/lead-form";

export const metadata: Metadata = {
  title: getTitle("Add Lead"),
};

export default function Page() {
  return (
    <TeamSection>
      <TeamHeader
        title="Add Lead"
        links={[
          {
            title: "Leads",
            href: "/leads",
          },
        ]}
      />
      <div className="container">
        <div className="mb-4">
          <TeamTitle>Add Lead</TeamTitle>
        </div>
        <LeadForm />
      </div>
    </TeamSection>
  );
}
