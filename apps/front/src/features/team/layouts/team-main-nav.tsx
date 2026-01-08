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

  // Group color mapping for visual hierarchy
  const getGroupColors = (groupId: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string; border: string }> = {
      "command": { bg: "bg-gradient-to-r from-slate-800 to-slate-700", text: "text-white", icon: "text-blue-400", border: "border-l-blue-500" },
      "prospecting": { bg: "bg-gradient-to-r from-emerald-900/50 to-emerald-800/30", text: "text-emerald-300", icon: "text-emerald-400", border: "border-l-emerald-500" },
      "pipeline": { bg: "bg-gradient-to-r from-purple-900/50 to-purple-800/30", text: "text-purple-300", icon: "text-purple-400", border: "border-l-purple-500" },
      "outreach": { bg: "bg-gradient-to-r from-orange-900/50 to-orange-800/30", text: "text-orange-300", icon: "text-orange-400", border: "border-l-orange-500" },
      "inbound": { bg: "bg-gradient-to-r from-cyan-900/50 to-cyan-800/30", text: "text-cyan-300", icon: "text-cyan-400", border: "border-l-cyan-500" },
      "ai": { bg: "bg-gradient-to-r from-pink-900/50 to-pink-800/30", text: "text-pink-300", icon: "text-pink-400", border: "border-l-pink-500" },
      "analytics": { bg: "bg-gradient-to-r from-blue-900/50 to-blue-800/30", text: "text-blue-300", icon: "text-blue-400", border: "border-l-blue-500" },
      "admin": { bg: "bg-gradient-to-r from-zinc-800/50 to-zinc-700/30", text: "text-zinc-300", icon: "text-zinc-400", border: "border-l-zinc-500" },
    };
    return colors[groupId] || { bg: "bg-muted/30", text: "text-foreground", icon: "text-muted-foreground", border: "border-l-muted" };
  };

  return (
    <div className="flex flex-col gap-2 px-2">
      {filteredNavGroups.map((group, groupIndex) => {
        const colors = getGroupColors(group.id);
        return (
          <Collapsible
            key={group.id}
            defaultOpen={["command", "prospecting", "pipeline", "outreach"].includes(group.id)}
            className="group/nav-section"
          >
            <SidebarGroup className="py-0">
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className={`text-xs font-bold tracking-wider uppercase px-3 py-3 cursor-pointer hover:opacity-90 rounded-lg transition-all flex items-center justify-between w-full border-l-4 ${colors.bg} ${colors.text} ${colors.border}`}>
                  <div className="flex items-center gap-2">
                    {group.icon && <group.icon className={`h-4 w-4 ${colors.icon}`} />}
                    <span className="text-[11px]">{group.label}</span>
                  </div>
                  <ChevronRightIcon className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]/nav-section:rotate-90" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent className="pl-3 mt-1">
                  <SidebarMenu>
                    {group.items.map((item, itemIndex) =>
                      renderNavItem(item, itemIndex),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </div>
  );
}
