import { BusinessListImport } from "@/features/lead/components/business-list-import";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";

export default function Page() {
  return (
    <TeamSection>
      <TeamHeader
        title="Import Business List"
        links={[
          {
            href: "/leads",
            title: "Leads",
          },
        ]}
      />

      <div className="container">
        <BusinessListImport />
      </div>
    </TeamSection>
  );
}
