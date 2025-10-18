"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsSidebar() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/settings",
      label: "General",
      active: pathname === "/settings",
    },
    {
      href: "/settings/users",
      label: "Users & Teams",
      active: pathname === "/settings/users",
    },
    {
      href: "/settings/api-integrations",
      label: "API Integrations",
      active: pathname === "/settings/api-integrations",
    },
    {
      href: "/settings/call-center",
      label: "Call Center",
      active: pathname === "/settings/call-center",
    },
    {
      href: "/settings/workflows",
      label: "Workflows",
      active: pathname === "/settings/workflows",
    },
    {
      href: "/settings/ai-sdr",
      label: "AI SDR Avatars",
      active: pathname === "/settings/ai-sdr",
    },
    {
      href: "/settings/zoho-integration",
      label: "Zoho Integration",
      active: pathname === "/settings/zoho-integration",
    },
    {
      href: "/settings/batch-jobs",
      label: "Batch Jobs",
      active: pathname === "/settings/batch-jobs",
    },
    {
      href: "/settings/data-schema",
      label: "Data Schema",
      active: pathname === "/settings/data-schema",
    },
  ];

  return (
    <div className="border-r h-full">
      <div className="p-6">
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>
      <div className="border-t">
        <nav className="flex flex-col p-6 space-y-4">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                route.active
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
