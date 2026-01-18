"use client";

import { ChevronsUpDown, LogOutIcon, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { initial } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthState } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-logout";

// Map role to display label
const ROLE_LABELS: Record<string, string> = {
  OWNER: "Platform Owner",
  ADMIN: "Admin",
  MEMBER: "Team Member",
  VIEWER: "Viewer",
};

export function TeamUserNav() {
  const { isMobile } = useSidebar();
  const user = useAuthState();
  const [logout, { loading }] = useLogout();

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {initial(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg divide-y"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {initial(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuGroup className="p-1">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm">Theme</span>
                <ThemeToggle />
              </div>
            </DropdownMenuGroup>
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem
                className="justify-between"
                asChild
                disabled={loading}
                preventDefault
              >
                <button type="button" className="w-full" onClick={logout}>
                  Log out
                  <LogOutIcon className="size-4" />
                </button>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
