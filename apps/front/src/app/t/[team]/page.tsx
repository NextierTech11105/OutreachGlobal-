import { TeamDashboardReport } from "@/features/report/components/team-dashboard-report";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";

export default function Page() {
  return (
    <TeamSection>
      <TeamHeader title="Dashboard" />

      <div className="container space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <TeamDashboardReport />
        </div>

        {/* <TwilioTestVoice /> */}
      </div>
    </TeamSection>
  );
}
