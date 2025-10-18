import { DashboardShell } from "@/components/dashboard-shell";
import { CompoundQueryBuilder } from "@/components/compound-query-builder";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";

export default function SearchPage() {
  return (
    <TeamSection>
      <TeamHeader title="Search" />

      <div className="container">
        <CompoundQueryBuilder />
      </div>
    </TeamSection>
  );
}
