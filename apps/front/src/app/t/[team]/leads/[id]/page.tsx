import { Suspense } from "react";
import { LeadDetailSkeleton } from "@/components/lead-detail-skeleton";
import { TeamSection } from "@/features/team/layouts/team-section";
import { PageProps } from "@/types/route.type";
import { getLeadDetails } from "@/features/lead/lead.data";
import { LeadDetails } from "@/features/lead/components/lead-details";
import { TeamHeader } from "@/features/team/layouts/team-header";

export default async function LeadDetailPage({
  params,
}: PageProps<{ id: string; team: string }>) {
  const { id, team } = await params;
  const lead = await getLeadDetails(id, team);

  return (
    <TeamSection>
      <TeamHeader
        title={lead.name || lead.id}
        links={[
          {
            title: "Leads",
            href: "/leads",
          },
        ]}
      />

      <div className="container mx-auto space-y-8">
        <Suspense fallback={<LeadDetailSkeleton />}>
          <LeadDetails lead={lead} />
        </Suspense>
      </div>
    </TeamSection>
  );
}
