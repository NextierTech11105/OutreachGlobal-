"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { useState, useMemo } from "react";
import {
  navigationGroups,
  getFilteredNavigation,
  mapTeamRoleToNavRole,
  type NavGroup,
  type NavItem,
} from "@/config/navigation";
import { Badge } from "@/components/ui/badge";

interface AdminSidebarProps {
  /** User's role in the team (admin, member, viewer) */
  userRole?: string;
  /** Whether the user has completed onboarding */
  isOnboardingComplete?: boolean;
}

export function AdminSidebar({
  userRole,
  isOnboardingComplete = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  // All sections expanded by default
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    navigationGroups.forEach((group) => {
      initial[group.id] = true;
    });
    return initial;
  });

  // Get filtered navigation based on user role and onboarding status
  const navRole = mapTeamRoleToNavRole(userRole);
  const filteredNavGroups = useMemo(
    () => getFilteredNavigation(navRole, isOnboardingComplete),
    [navRole, isOnboardingComplete],
  );

  const toggleSection = (groupId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Check if a nav item is active
  const isItemActive = (item: NavItem): boolean => {
    if (item.href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(item.href);
  };

  // Check if any item in a group is active
  const isGroupActive = (group: NavGroup): boolean => {
    return group.items.some((item) => isItemActive(item));
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <div className="flex h-14 items-center px-4 border-b border-zinc-800">
        <Link href="/admin" className="flex items-center font-semibold">
          <LayoutGrid className="mr-2 h-5 w-5 text-zinc-400" />
          <span className="text-zinc-100">Admin Portal</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-2">
        <nav className="space-y-1 px-2">
          {filteredNavGroups.map((group) => (
            <div key={group.id}>
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleSection(group.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  isGroupActive(group)
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
                )}
              >
                <div className="flex items-center gap-2">
                  {group.icon && <group.icon className="h-4 w-4" />}
                  <span className="font-medium">{group.label}</span>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections[group.id] && "rotate-90",
                  )}
                />
              </button>

              {/* Group Items */}
              {expandedSections[group.id] && (
                <div className="mt-1 space-y-0.5 pl-4">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors",
                        isItemActive(item)
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge
                          variant={item.badgeVariant || "default"}
                          className="ml-2 h-5 px-1.5 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-zinc-800">
        <Link
          href="/"
          className="flex items-center text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
