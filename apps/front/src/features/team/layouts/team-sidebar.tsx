"use client";

import { ArrowUpCircleIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { TeamMainNav } from "./team-main-nav";
import { TeamUserNav } from "./team-user-nav";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "PushButtonCode";

export function TeamSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const params = useParams();
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href={`/${params.team}`}>
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">{APP_NAME}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <TeamMainNav />
      </SidebarContent>
      <SidebarFooter>
        <TeamUserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
