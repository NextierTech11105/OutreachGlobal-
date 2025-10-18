"use client";

import {
  BarChartIcon,
  BotIcon,
  BuildingIcon,
  ChevronRightIcon,
  HomeIcon,
  MailIcon,
  MegaphoneIcon,
  PhoneIcon,
  SearchIcon,
  SettingsIcon,
  SparkleIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useActivePath } from "@/hooks/use-active-path";
import { useParams } from "next/navigation";
import { TeamLink } from "../components/team-link";
import { Fragment } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const items = [
  {
    title: "Dashboard",
    path: "/",
    icon: HomeIcon,
    exact: true,
  },
  {
    title: "Properties",
    path: "/properties",
    icon: BuildingIcon,
  },
  // {
  //   title: "Search",
  //   path: "/search",
  //   icon: SearchIcon,
  // },
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
    title: "Leads",
    path: "/leads",
    icon: UsersIcon,
  },
  // {
  //   title: "Power Dialers",
  //   path: "/power-dialers",
  //   icon: PhoneIcon,
  // },
  {
    title: "Analytics",
    path: "/analytics",
    icon: BarChartIcon,
  },
  {
    title: "Call Center",
    path: "/call-center",
    icon: PhoneIcon,
  },
  {
    title: "Inbox",
    path: "/inbox",
    icon: MailIcon,
  },
  {
    title: "Integrations",
    path: "#",
    icon: ZapIcon,
    items: [
      {
        title: "CRM",
        path: "/integrations/crm",
      },
      {
        title: "Twilio Settings",
        path: "/integrations/twilio",
      },
      {
        title: "SendGrid Settings",
        path: "/integrations/sendgrid",
      },
    ],
  },
  {
    title: "Prompt Library",
    path: "/prompts",
    icon: SparkleIcon,
  },
  {
    title: "AI SDR Avatars",
    path: "/ai-sdr",
    icon: BotIcon,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: SettingsIcon,
  },
];

export function TeamMainNav() {
  const params = useParams<{ team: string }>();
  const [isActive] = useActivePath({ baseUri: `/${params.team}` });
  const isPathActive = (item: Omit<(typeof items)[number], "icon">) => {
    return isActive({
      href:
        item.path === "/"
          ? `/t/${params.team}`
          : `/t/${params.team}${item.path}`,
      exact: item.exact,
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item, index) => (
            <Fragment key={index}>
              {!item.items?.length ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={item.title}
                    asChild
                    isActive={isPathActive(item)}
                  >
                    <TeamLink href={item.path}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </TeamLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <Collapsible
                  asChild
                  className="group/collapsible"
                  defaultOpen={item.items.some((subItem) =>
                    isPathActive(subItem),
                  )}
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
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isPathActive(subItem)}
                            >
                              <TeamLink href={subItem.path}>
                                <span>{subItem.title}</span>
                              </TeamLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </Fragment>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
