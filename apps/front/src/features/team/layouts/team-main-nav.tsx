"use client";

import { useState, useEffect } from "react";
import {
  BarChartIcon,
  BellIcon,
  BookOpenIcon,
  BotIcon,
  BrainIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CogIcon,
  EyeIcon,
  FileTextIcon,
  FlameIcon,
  FolderOpenIcon,
  GitBranchIcon,
  HomeIcon,
  LayersIcon,
  LibraryIcon,
  MailIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  PhoneIcon,
  RefreshCwIcon,
  RocketIcon,
  SendIcon,
  ShieldIcon,
  SmileIcon,
  SparkleIcon,
  UsersIcon,
  UserSearchIcon,
  ZapIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuBadge,
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

// Badge counts type
interface BadgeCounts {
  inbox: number;
  gianna: number;
  cathy: number;
  sabrina: number;
  smsQueue: number;
}

// Organized navigation groups
const navGroups = [
  {
    label: "Get Started",
    items: [
      {
        title: "Build Your Machine",
        path: "/onboarding",
        icon: RocketIcon,
        isAbsolute: true,
      },
    ],
  },
  {
    label: "Home",
    items: [
      {
        title: "Dashboard",
        path: "/",
        icon: HomeIcon,
        exact: true,
      },
      {
        title: "Command Center",
        path: "/command-center",
        icon: ZapIcon,
      },
      {
        title: "Analytics",
        path: "/analytics",
        icon: BarChartIcon,
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        title: "Leads",
        path: "/leads",
        icon: UsersIcon,
      },
      {
        title: "Skip Trace",
        path: "/skip-trace",
        icon: UserSearchIcon,
      },
      {
        title: "Data Hub",
        path: "/data-hub",
        icon: ZapIcon,
      },
      {
        title: "Properties",
        path: "/properties",
        icon: BuildingIcon,
      },
      {
        title: "Sectors",
        path: "/sectors",
        icon: LayersIcon,
      },
    ],
  },
  {
    label: "Outreach",
    items: [
      {
        title: "Campaigns",
        path: "/campaigns",
        icon: MegaphoneIcon,
        items: [
          {
            title: "All Campaigns",
            path: "/campaigns",
            exact: true,
          },
          {
            title: "Content Library",
            path: "/library",
            icon: LibraryIcon,
          },
          {
            title: "Automation Rules",
            path: "/automation-rules",
          },
          {
            title: "Message Templates",
            path: "/message-templates",
          },
        ],
      },
      {
        title: "Sequence Designer",
        path: "/sequences",
        icon: GitBranchIcon,
      },
      {
        title: "Call Center",
        path: "/call-center",
        icon: PhoneIcon,
      },
      {
        title: "SMS Queue",
        path: "/sms/queue",
        icon: SendIcon,
      },
      {
        title: "AI Inbound Response Center",
        path: "/inbox",
        icon: SparkleIcon,
      },
      {
        title: "Calendar",
        path: "/calendar",
        icon: CalendarIcon,
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        title: "Gianna AI",
        path: "/inbox",
        icon: BrainIcon,
        items: [
          {
            title: "Inbound Responses",
            path: "/inbox",
            exact: true,
          },
          {
            title: "Train AI",
            path: "/ai-training",
          },
          {
            title: "AI Personas",
            path: "/settings/ai-sdr",
          },
        ],
      },
    ],
  },
  {
    label: "Workspaces",
    items: [
      {
        title: "Initial Message",
        path: "/workspaces/initial-message",
        icon: MessageCircleIcon,
      },
      {
        title: "Retarget",
        path: "/workspaces/retarget",
        icon: RefreshCwIcon,
      },
      {
        title: "Nudger",
        path: "/workspaces/nudger",
        icon: BellIcon,
      },
      {
        title: "Content Nurture",
        path: "/workspaces/content-nurture",
        icon: BookOpenIcon,
      },
      {
        title: "Book Appointment",
        path: "/workspaces/sabrina",
        icon: CalendarIcon,
      },
      {
        title: "Lead Calendar",
        path: "/workspaces/calendar",
        icon: CalendarIcon,
      },
    ],
  },
  {
    label: "Real Estate",
    items: [
      {
        title: "Valuation",
        path: "/valuation",
        icon: FileTextIcon,
        items: [
          {
            title: "New Valuation",
            path: "/valuation",
            exact: true,
          },
          {
            title: "Valuation Queue",
            path: "/valuation-queue",
          },
        ],
      },
      {
        title: "Research Library",
        path: "/research-library",
        icon: FolderOpenIcon,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Admin",
        path: "/admin",
        icon: ShieldIcon,
        isAbsolute: true,
        items: [
          {
            title: "Dashboard",
            path: "/admin",
            exact: true,
            isAbsolute: true,
          },
          {
            title: "MCP Configuration",
            path: "/admin/mcp",
            isAbsolute: true,
          },
          {
            title: "Apollo Settings",
            path: "/admin/integrations/apollo",
            isAbsolute: true,
          },
          {
            title: "Users",
            path: "/admin/users",
            isAbsolute: true,
          },
        ],
      },
    ],
  },
];

// Type for nav items
type NavItem = (typeof navGroups)[number]["items"][number];

// Path to badge key mapping
const pathToBadgeKey: Record<string, keyof BadgeCounts> = {
  "/inbox": "inbox",
  "/sms/queue": "smsQueue",
  "/campaigns/gianna": "gianna",
  "/campaigns/cathy": "cathy",
  "/campaigns/sabrina": "sabrina",
};

export function TeamMainNav() {
  const params = useParams<{ team: string }>();
  const pathname = usePathname();
  const [isActive] = useActivePath({ baseUri: `/${params.team}` });
  const { team } = useCurrentTeam();

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
        // Fetch all counts in parallel
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
        console.error("Failed to fetch badge counts:", error);
        // Use mock data for demonstration
        setBadgeCounts({
          inbox: 12,
          gianna: 45,
          cathy: 23,
          sabrina: 8,
          smsQueue: 156,
        });
      }
    }

    fetchBadgeCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [team?.id]);

  // Get badge count for a path
  const getBadgeCount = (path: string): number => {
    const key = pathToBadgeKey[path];
    return key ? badgeCounts[key] : 0;
  };

  const isPathActive = (item: {
    path: string;
    exact?: boolean;
    isAbsolute?: boolean;
  }) => {
    if (item.isAbsolute) {
      if (item.exact) {
        return pathname === item.path;
      }
      return pathname.startsWith(item.path);
    }
    return isActive({
      href:
        item.path === "/"
          ? `/t/${params.team}`
          : `/t/${params.team}${item.path}`,
      exact: item.exact,
    });
  };

  const renderNavItem = (item: NavItem, index: number) => {
    const ItemLink = (item as { isAbsolute?: boolean }).isAbsolute
      ? Link
      : TeamLink;
    const hasSubItems = "items" in item && item.items && item.items.length > 0;
    const badgeCount = getBadgeCount(item.path);

    if (!hasSubItems) {
      return (
        <SidebarMenuItem key={index}>
          <SidebarMenuButton
            tooltip={item.title}
            asChild
            isActive={isPathActive(item)}
          >
            <ItemLink href={item.path}>
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              {badgeCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-auto h-5 min-w-[20px] px-1.5 text-xs bg-red-500 hover:bg-red-500"
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </Badge>
              )}
            </ItemLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    const subItems = (
      item as {
        items: Array<{
          title: string;
          path: string;
          exact?: boolean;
          isAbsolute?: boolean;
        }>;
      }
    ).items;

    return (
      <Collapsible
        key={index}
        asChild
        className="group/collapsible"
        defaultOpen={subItems.some((subItem) => isPathActive(subItem))}
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title}>
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <SidebarMenuSub>
              {subItems.map((subItem) => {
                const SubItemLink = subItem.isAbsolute ? Link : TeamLink;
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isPathActive(subItem)}
                    >
                      <SubItemLink href={subItem.path}>
                        <span>{subItem.title}</span>
                      </SubItemLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {navGroups.map((group, groupIndex) => (
        <Collapsible
          key={groupIndex}
          defaultOpen={false}
          className="group/nav-section"
        >
          <SidebarGroup className="py-0">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-sm font-semibold text-foreground px-3 py-2.5 cursor-pointer hover:bg-muted/50 rounded-md transition-colors flex items-center justify-between w-full">
                <span>{group.label}</span>
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
