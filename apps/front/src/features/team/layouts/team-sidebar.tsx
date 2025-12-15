"use client";

import { ArrowUpCircleIcon } from "lucide-react";
import Image from "next/image";

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
import { APP_NAME } from "@/config/title";

const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || "";

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
              <Link href={`/t/${params.team}`} className="flex items-center gap-2">
                {LOGO_URL ? (
                  <Image src={LOGO_URL} alt={APP_NAME} width={120} height={32} className="h-8 w-auto" />
                ) : (
                  <>
                    <ArrowUpCircleIcon className="h-5 w-5" />
                    <span className="text-base font-semibold">{APP_NAME}</span>
                  </>
                )}
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
