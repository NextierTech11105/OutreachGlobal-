"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Settings,
  Database,
  Bot,
  Zap,
  LayoutGrid,
  Megaphone,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  children?: {
    href: string;
    label: string;
    active: boolean;
  }[];
};

export function AdminSidebar() {
  const pathname = usePathname();
  // Start all sections collapsed for cleaner look
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const routes: NavItem[] = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: <BarChart3 className="h-4 w-4" />,
      active: pathname === "/admin",
    },
    {
      label: "Data Sources",
      icon: <Database className="h-4 w-4" />,
      active:
        pathname.startsWith("/admin/data") ||
        pathname === "/admin/b2b" ||
        pathname === "/admin/mcp",
      children: [
        {
          href: "/admin/b2b",
          label: "B2B Lead Search",
          active: pathname === "/admin/b2b",
        },
        {
          href: "/admin/mcp",
          label: "MCP Lead Tracker",
          active: pathname === "/admin/mcp",
        },
        {
          href: "/admin/data/import",
          label: "Data Import",
          active: pathname === "/admin/data/import",
        },
        {
          href: "/admin/data/schema",
          label: "Data Schema",
          active: pathname === "/admin/data/schema",
        },
        {
          href: "/admin/data/verification",
          label: "Verification",
          active: pathname === "/admin/data/verification",
        },
      ],
    },
    {
      label: "Campaigns",
      icon: <Megaphone className="h-4 w-4" />,
      active:
        pathname.startsWith("/admin/campaigns") ||
        pathname === "/admin/message-templates",
      children: [
        {
          href: "/admin/campaigns/scoring",
          label: "Scoring & Tagging",
          active: pathname === "/admin/campaigns/scoring",
        },
        {
          href: "/admin/campaigns/matrix",
          label: "Matrix Editor",
          active: pathname === "/admin/campaigns/matrix",
        },
        {
          href: "/admin/campaigns/automation",
          label: "Automation Rules",
          active: pathname === "/admin/campaigns/automation",
        },
        {
          href: "/admin/message-templates",
          label: "Message Templates",
          active: pathname === "/admin/message-templates",
        },
      ],
    },
    {
      label: "AI & Automation",
      icon: <Bot className="h-4 w-4" />,
      active:
        pathname === "/admin/ai-sdr" ||
        pathname === "/admin/prompt-library" ||
        pathname === "/admin/workflows" ||
        pathname === "/admin/batch-jobs",
      children: [
        {
          href: "/admin/ai-sdr",
          label: "AI SDR Avatars",
          active: pathname === "/admin/ai-sdr",
        },
        {
          href: "/admin/prompt-library",
          label: "Prompt Library",
          active: pathname === "/admin/prompt-library",
        },
        {
          href: "/admin/workflows",
          label: "Workflows",
          active: pathname === "/admin/workflows",
        },
        {
          href: "/admin/batch-jobs",
          label: "Batch Jobs",
          active: pathname === "/admin/batch-jobs",
        },
      ],
    },
    {
      label: "Integrations",
      icon: <Zap className="h-4 w-4" />,
      active: pathname.startsWith("/admin/integrations"),
      children: [
        {
          href: "/admin/integrations/signalhouse",
          label: "SignalHouse SMS",
          active: pathname === "/admin/integrations/signalhouse",
        },
        {
          href: "/admin/integrations/twilio",
          label: "Twilio",
          active: pathname === "/admin/integrations/twilio",
        },
        {
          href: "/admin/integrations/sendgrid",
          label: "SendGrid Email",
          active: pathname === "/admin/integrations/sendgrid",
        },
        {
          href: "/admin/integrations/apollo",
          label: "Apollo.io",
          active: pathname === "/admin/integrations/apollo",
        },
        {
          href: "/admin/integrations/llm-settings",
          label: "LLM Settings",
          active: pathname === "/admin/integrations/llm-settings",
        },
        {
          href: "/admin/integrations/api",
          label: "API Keys",
          active: pathname === "/admin/integrations/api",
        },
      ],
    },
    {
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      active:
        pathname === "/admin/users" ||
        pathname === "/admin/billing" ||
        pathname === "/admin/system",
      children: [
        {
          href: "/admin/users",
          label: "Users",
          active: pathname === "/admin/users",
        },
        {
          href: "/admin/billing",
          label: "Billing & Revenue",
          active: pathname === "/admin/billing",
        },
        {
          href: "/admin/system",
          label: "System",
          active: pathname === "/admin/system",
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-zinc-900 text-zinc-100">
      <div className="flex h-14 items-center px-4 border-b border-zinc-800">
        <Link href="/admin" className="flex items-center font-semibold">
          <LayoutGrid className="mr-2 h-5 w-5 text-zinc-400" />
          <span className="text-zinc-100">Admin Portal</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="space-y-0.5 px-2">
          {routes.map((route, index) => (
            <div key={index}>
              {route.children ? (
                <div>
                  <button
                    onClick={() => toggleSection(route.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                      route.active
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
                    )}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{route.icon}</span>
                      <span>{route.label}</span>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedSections[route.label] && "rotate-90",
                      )}
                    />
                  </button>
                  {expandedSections[route.label] && (
                    <div className="mt-1 space-y-1 pl-6">
                      {route.children.map((child, childIndex) => (
                        <Link
                          key={childIndex}
                          href={child.href}
                          className={cn(
                            "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                            child.active
                              ? "bg-zinc-800 text-zinc-100"
                              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={route.href!}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                    route.active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
                  )}
                >
                  <span className="mr-2">{route.icon}</span>
                  <span>{route.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
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
