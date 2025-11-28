"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  const routes = [
    {
      href: "/",
      label: "Dashboard",
      active: pathname === "/",
    },
    {
      href: "/search",
      label: "Search",
      active: pathname === "/search" || pathname.startsWith("/search/"),
    },
    {
      href: "/campaigns",
      label: "Campaigns",
      active: pathname === "/campaigns" || pathname.startsWith("/campaigns/"),
    },
    {
      href: "/leads",
      label: "Leads",
      active: pathname === "/leads" || pathname.startsWith("/leads/"),
    },
    {
      href: "/analytics",
      label: "Analytics",
      active: pathname === "/analytics",
    },
    {
      href: "/call-center",
      label: "Call Center",
      active:
        pathname === "/call-center" || pathname.startsWith("/call-center/"),
    },
    {
      href: "/inbox",
      label: "Inbox",
      active: pathname === "/inbox",
    },
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active ? "text-primary" : "text-muted-foreground",
          )}
        >
          {route.label}
        </Link>
      ))}
      <Link
        href="/admin"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary ml-auto flex items-center"
      >
        <Settings className="mr-1 h-4 w-4" />
        Admin
      </Link>
    </nav>
  );
}
