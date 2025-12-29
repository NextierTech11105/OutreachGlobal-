"use client";

import {
  BarChartIcon,
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
} from "@/components/ui/sidebar";
import { useActivePath } from "@/hooks/use-active-path";
import { useParams, usePathname } from "next/navigation";
import { TeamLink } from "../components/team-link";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
      {
        title: "Content Library",
        path: "/library",
        icon: LibraryIcon,
      },
    ],
  },
  {
    label: "AI Workers",
    items: [
      {
        title: "GIANNA (Opener)",
        path: "/campaigns/gianna",
        icon: SparkleIcon,
      },
      {
        title: "CATHY (Nudger)",
        path: "/campaigns/cathy",
        icon: SmileIcon,
      },
      {
        title: "SABRINA (Closer)",
        path: "/campaigns/sabrina",
        icon: CheckCircle2Icon,
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
        icon: SmileIcon,
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

export function TeamMainNav() {
  const params = useParams<{ team: string }>();
  const pathname = usePathname();
  const [isActive] = useActivePath({ baseUri: `/${params.team}` });

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
