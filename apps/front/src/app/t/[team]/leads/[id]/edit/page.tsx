import type { Metadata } from "next";
import { getTitle } from "@/config/title";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { LeadForm } from "@/features/lead/components/lead-form";
import { PageProps } from "@/types/route.type";
import { getLeadForm } from "@/features/lead/lead.data";

export const metadata: Metadata = {
  title: getTitle("Edit Lead"),
};

export default async function Page({
  params,
}: PageProps<{ id: string; team: string }>) {
  const { id, team } = await params;
  const lead = await getLeadForm(id, team);
  return (
    <TeamSection>
      <TeamHeader
        title="Edit Lead"
        links={[
          {
            title: "Leads",
            href: "/leads",
          },
        ]}
      />
      <div className="container">
        <div className="mb-4">
          <TeamTitle>Edit Lead</TeamTitle>
        </div>
        <LeadForm lead={lead} />
      </div>
    </TeamSection>
  );
}
