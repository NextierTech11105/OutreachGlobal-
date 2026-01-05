"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRightIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useActivePath } from "@/hooks/use-active-path";
import { useParams, usePathname } from "next/navigation";
import { TeamLink } from "../components/team-link";
import { useCurrentTeam } from "../team.context";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  navigationGroups,
  getFilteredNavigation,
  mapTeamRoleToNavRole,
  type NavGroup,
  type NavItem,
} from "@/config/navigation";

// Badge counts type
interface BadgeCounts {
  inbox: number;
  gianna: number;
  cathy: number;
  sabrina: number;
  smsQueue: number;
}

// Path to badge key mapping
const pathToBadgeKey: Record<string, keyof BadgeCounts> = {
  "/admin/inbox": "inbox",
  "/sms/queue": "smsQueue",
  "/campaigns/gianna": "gianna",
  "/campaigns/cathy": "cathy",
  "/campaigns/sabrina": "sabrina",
};

// Map admin paths to team paths for the team context
function mapAdminPathToTeamPath(adminHref: string): string {
  // Convert /admin/* paths to team-relative paths
  if (adminHref.startsWith("/admin/")) {
    return adminHref.replace("/admin/", "/");
  }
  if (adminHref === "/admin") {
    return "/";
  }
  return adminHref;
}

export function TeamMainNav() {
  const params = useParams<{ team: string }>();
  const pathname = usePathname();
  const [isActive] = useActivePath({ baseUri: `/t/${params.team}` });
  const { team, teamMember } = useCurrentTeam();

  // Get user role for filtering
  const userRole = mapTeamRoleToNavRole(teamMember?.role);

  // Get filtered navigation based on role
  const filteredNavGroups = useMemo(() => {
    // TODO: Replace false with actual onboarding completion status
    const isOnboardingComplete = false;
    return getFilteredNavigation(userRole, isOnboardingComplete);
  }, [userRole]);

  // Badge counts state
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    inbox: 0,
    gianna: 0,
    cathy: 0,
    sabrina: 0,
    smsQueue: 0,
  });

  // Fetch badge counts
  useEffect(() => {
    async function fetchBadgeCounts() {
      if (!team?.id) return;

      try {
        const [inboxRes, queueRes] = await Promise.all([
          fetch(`/api/messages/unread-count?teamId=${team.id}`),
          fetch(`/api/leads/worker-counts?teamId=${team.id}`),
        ]);

        const inboxData = await inboxRes.json().catch(() => ({ count: 0 }));
        const queueData = await queueRes.json().catch(() => ({
          gianna: 0,
          cathy: 0,
          sabrina: 0,
          smsQueue: 0,
        }));

        setBadgeCounts({
          inbox: inboxData.count || 0,
          gianna: queueData.gianna || 0,
          cathy: queueData.cathy || 0,
          sabrina: queueData.sabrina || 0,
          smsQueue: queueData.smsQueue || 0,
        });
      } catch (error) {
        // Silent fail - badge counts are not critical
      }
    }

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [team?.id]);

  // Get badge count for a path
  const getBadgeCount = (href: string): number => {
    const key = pathToBadgeKey[href];
    return key ? badgeCounts[key] : 0;
  };

  // Check if a path is active
  const isPathActive = (href: string) => {
    const teamPath = mapAdminPathToTeamPath(href);
    const fullPath =
      teamPath === "/" ? `/t/${params.team}` : `/t/${params.team}${teamPath}`;

    return isActive({ href: fullPath, exact: teamPath === "/" });
  };

  // Render a single navigation item
  const renderNavItem = (item: NavItem, index: number) => {
    const teamPath = mapAdminPathToTeamPath(item.href);
    const badgeCount = getBadgeCount(item.href);

    return (
      <SidebarMenuItem key={index}>
        <SidebarMenuButton
          tooltip={item.description || item.label}
          asChild
          isActive={isPathActive(item.href)}
        >
          <TeamLink href={teamPath}>
            {item.icon && <item.icon className="h-4 w-4" />}
            <span>{item.label}</span>
            {badgeCount > 0 && (
              <Badge
                variant="default"
                className="ml-auto h-5 min-w-[20px] px-1.5 text-xs bg-red-500 hover:bg-red-500"
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </Badge>
            )}
            {item.badge && (
              <Badge
                variant={item.badgeVariant || "secondary"}
                className="ml-auto h-5 px-1.5 text-xs"
              >
                {item.badge}
              </Badge>
            )}
          </TeamLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {filteredNavGroups.map((group, groupIndex) => (
        <Collapsible
          key={group.id}
          defaultOpen={group.id === "command"} // Default open the COMMAND group
          className="group/nav-section"
        >
          <SidebarGroup className="py-0">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-sm font-semibold text-foreground px-3 py-2.5 cursor-pointer hover:bg-muted/50 rounded-md transition-colors flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {group.icon && <group.icon className="h-4 w-4" />}
                  <span>{group.label}</span>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/nav-section:rotate-90" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="pl-2">
                <SidebarMenu>
                  {group.items.map((item, itemIndex) =>
                    renderNavItem(item, itemIndex),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </div>
  );
}
