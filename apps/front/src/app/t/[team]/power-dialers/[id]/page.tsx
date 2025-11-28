import { PowerDialer } from "@/features/power-dialer/components/power-dialer";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamSection } from "@/features/team/layouts/team-section";
import { PageProps } from "@/types/route.type";
import { getPowerDialerDetails } from "@/features/power-dialer/power-dialer.data";
import { PowerDialerProvider } from "@/features/power-dialer/power-dialer-provider";

export default async function Page({
  params,
}: PageProps<{ team: string; id: string }>) {
  const { team: teamSlug, id } = await params;
  const powerDialer = await getPowerDialerDetails(id, teamSlug);
  return (
    <TeamSection>
      <TeamHeader
        title={powerDialer.title}
        links={[{ title: "Power Dialers", href: "/power-dialers" }]}
      />

      <PowerDialerProvider powerDialer={powerDialer}>
        <PowerDialer powerDialer={powerDialer} />
      </PowerDialerProvider>
    </TeamSection>
  );
}
