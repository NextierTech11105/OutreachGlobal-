import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getTitle } from "@/config/title";
import { TeamSidebar } from "@/features/team/layouts/team-sidebar";
import { TeamProvider } from "@/features/team/team-provider";
import { getTeam } from "@/features/team/team.data";
import { LayoutProps } from "@/types/route.type";
import { Metadata } from "next";
import { GlobalActionsProvider } from "@/lib/providers/global-actions-provider";
import { TenantConfigProvider } from "@/lib/tenant";
import { CopilotKiosk } from "@/components/copilot-kiosk";

export const generateMetadata = async ({
  params,
}: LayoutProps<{ team: string }>): Promise<Metadata> => {
  const { team: id } = await params;
  const team = await getTeam(id);

  return {
    title: getTitle(team.name),
  };
};

export default async function Layout({
  children,
  params,
}: LayoutProps<{ team: string }>) {
  const { team: id } = await params;
  const team = await getTeam(id);
  return (
    <SidebarProvider>
      <TeamProvider team={team}>
        <GlobalActionsProvider>
          <TeamSidebar variant="inset" />
          <SidebarInset>
            <header className="bg-background sticky top-0 z-30 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
              <div
                className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6"
                id="team-header-wrapper"
              >
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mx-2 data-[orientation=vertical]:h-4"
                />
              </div>
            </header>
            <div className="pb-24">{children}</div>
            <TenantConfigProvider>
              <CopilotKiosk />
            </TenantConfigProvider>
          </SidebarInset>
        </GlobalActionsProvider>
      </TeamProvider>
    </SidebarProvider>
  );
}
