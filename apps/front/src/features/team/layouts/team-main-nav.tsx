"use client";

import {
  BarChartIcon,
  ChevronRightIcon,
  HomeIcon,
  InboxIcon,
  MegaphoneIcon,
  PhoneIcon,
  SettingsIcon,
  UsersIcon,
  CableIcon,
  Users2Icon,
  ShieldIcon,
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

// STREAMLINED NAVIGATION - 4 sections only
const navGroups = [
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
        title: "Analytics",
        path: "/analytics",
        icon: BarChartIcon,
      },
    ],
  },
  {
    label: "Leads",
    items: [
      {
        title: "All Leads",
        path: "/leads",
        icon: UsersIcon,
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
      },
      {
        title: "Inbox",
        path: "/inbox",
        icon: InboxIcon,
      },
      {
        title: "Call Queue",
        path: "/call-center",
        icon: PhoneIcon,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Integrations",
        path: "/admin/integrations",
        icon: CableIcon,
        isAbsolute: true,
      },
      {
        title: "Team",
        path: "/settings/team",
        icon: Users2Icon,
      },
      {
        title: "Admin",
        path: "/admin",
        icon: ShieldIcon,
        isAbsolute: true,
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
    const hasSubItems = "items" in item && (item as { items?: unknown[] }).items && ((item as { items: unknown[] }).items).length > 0;

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
          defaultOpen={true}
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
