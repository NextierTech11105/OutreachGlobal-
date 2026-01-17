"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Users,
  BarChart3,
  Phone,
  Inbox,
  Settings,
  Bot,
  MessageSquare,
  Mail,
  Zap,
  Database,
  Workflow,
  Clock,
  FileText,
  Cable,
  UserPlus,
  Search,
  Map,
  CheckCircle2,
  Target,
  Grid3X3,
  ArrowRight,
} from "lucide-react";

interface PageLink {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

interface PageSection {
  title: string;
  pages: PageLink[];
}

const sections: PageSection[] = [
  {
    title: "Tools & Landing Pages",
    pages: [
      {
        name: "Lead Lab",
        href: "/lead-lab",
        icon: BarChart3,
        description: "Contactability assessment - upload CSV, get lead quality report",
      },
    ],
  },
  {
    title: "Dashboard & Properties",
    pages: [
      {
        name: "Dashboard",
        href: "/t/default",
        icon: LayoutDashboard,
        description: "Main dashboard overview",
      },
      {
        name: "Properties",
        href: "/t/default/properties",
        icon: Building2,
        description: "Property search & map",
      },
      {
        name: "Property Search",
        href: "/t/default/search",
        icon: Search,
        description: "Advanced property search",
      },
      {
        name: "Saved Searches",
        href: "/t/default/search/saved",
        icon: Map,
        description: "Your saved property searches",
      },
      {
        name: "Verify & Enrich",
        href: "/t/default/verify-enrich",
        icon: CheckCircle2,
        description: "Data verification & enrichment",
      },
    ],
  },
  {
    title: "Campaigns",
    pages: [
      {
        name: "All Campaigns",
        href: "/t/default/campaigns",
        icon: Megaphone,
        description: "View all campaigns",
      },
      {
        name: "Create Campaign",
        href: "/t/default/campaigns/create",
        icon: UserPlus,
        description: "Create new campaign",
      },
      {
        name: "Automation Rules",
        href: "/t/default/automation-rules",
        icon: Zap,
        description: "Campaign automation",
      },
      {
        name: "Campaign Matrix",
        href: "/admin/campaigns/matrix",
        icon: Grid3X3,
        description: "Campaign status matrix",
      },
      {
        name: "Lead Scoring",
        href: "/admin/campaigns/scoring",
        icon: Target,
        description: "Lead scoring rules",
      },
    ],
  },
  {
    title: "Leads & Contacts",
    pages: [
      {
        name: "All Leads",
        href: "/t/default/leads",
        icon: Users,
        description: "Manage all leads",
      },
      {
        name: "Create Lead",
        href: "/t/default/leads/create",
        icon: UserPlus,
        description: "Add new lead",
      },
      {
        name: "Import Business List",
        href: "/t/default/leads/import-business-list",
        icon: Database,
        description: "Import B2B data",
      },
      {
        name: "B2B Enrichment",
        href: "/admin/b2b",
        icon: Building2,
        description: "B2B lead enrichment with property data",
      },
    ],
  },
  {
    title: "Communication",
    pages: [
      {
        name: "Inbox",
        href: "/t/default/inbox",
        icon: Inbox,
        description: "Unified inbox",
      },
      {
        name: "Call Center",
        href: "/t/default/call-center",
        icon: Phone,
        description: "Voice call center",
      },
      {
        name: "Power Dialer",
        href: "/t/default/call-center/power-dialer",
        icon: Phone,
        description: "Power dialer",
      },
      {
        name: "Message Templates",
        href: "/t/default/message-templates",
        icon: MessageSquare,
        description: "SMS/Email templates",
      },
      {
        name: "Prompts Library",
        href: "/t/default/prompts",
        icon: FileText,
        description: "AI prompt templates",
      },
    ],
  },
  {
    title: "AI & Automation",
    pages: [
      {
        name: "AI SDR Avatars",
        href: "/t/default/ai-sdr",
        icon: Bot,
        description: "AI sales reps",
      },
      {
        name: "Create AI SDR",
        href: "/t/default/ai-sdr/create",
        icon: UserPlus,
        description: "Create new AI avatar",
      },
      {
        name: "AI SDR Call Center",
        href: "/t/default/ai-sdr",
        icon: Bot,
        description: "AI-powered calling",
      },
    ],
  },
  {
    title: "Analytics & Reports",
    pages: [
      {
        name: "Analytics",
        href: "/t/default/analytics",
        icon: BarChart3,
        description: "Performance metrics",
      },
    ],
  },
  {
    title: "Integrations",
    pages: [
      {
        name: "CRM Integration",
        href: "/t/default/integrations/crm",
        icon: Database,
        description: "Zoho CRM setup",
      },
      {
        name: "Twilio Settings",
        href: "/t/default/integrations/twilio",
        icon: Phone,
        description: "Voice/SMS config",
      },
      {
        name: "SendGrid Settings",
        href: "/t/default/integrations/sendgrid",
        icon: Mail,
        description: "Email config",
      },
      {
        name: "SignalHouse",
        href: "/admin/integrations/signalhouse",
        icon: Phone,
        description: "SignalHouse voice",
      },
      {
        name: "LLM Settings",
        href: "/admin/integrations/llm-settings",
        icon: Bot,
        description: "AI model config",
      },
      {
        name: "API Keys",
        href: "/admin/integrations/api",
        icon: Zap,
        description: "External API keys",
      },
    ],
  },
  {
    title: "Settings",
    pages: [
      {
        name: "Profile",
        href: "/t/default/profile",
        icon: Users,
        description: "Your profile",
      },
      {
        name: "Team Settings",
        href: "/t/default/settings",
        icon: Settings,
        description: "Team configuration",
      },
      {
        name: "Account",
        href: "/t/default/settings/account",
        icon: Users,
        description: "Account settings",
      },
      {
        name: "Users",
        href: "/t/default/settings/users",
        icon: Users,
        description: "Team members",
      },
      {
        name: "Workflows",
        href: "/t/default/settings/workflows",
        icon: Workflow,
        description: "Workflow automation",
      },
      {
        name: "Batch Jobs",
        href: "/t/default/settings/batch-jobs",
        icon: Clock,
        description: "Scheduled jobs",
      },
    ],
  },
  {
    title: "Admin Panel",
    pages: [
      {
        name: "Admin Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        description: "Admin overview",
      },
      {
        name: "User Management",
        href: "/admin/users",
        icon: Users,
        description: "Manage all users",
      },
      {
        name: "System Settings",
        href: "/admin/system",
        icon: Settings,
        description: "System configuration",
      },
      {
        name: "MCP Connections",
        href: "/admin/mcp",
        icon: Cable,
        description: "Model Context Protocol",
      },
      {
        name: "Data Import",
        href: "/admin/data/import",
        icon: Database,
        description: "Bulk data import",
      },
      {
        name: "Prompt Library",
        href: "/admin/prompt-library",
        icon: FileText,
        description: "System prompts",
      },
      {
        name: "AI SDR Admin",
        href: "/admin/ai-sdr",
        icon: Bot,
        description: "Admin AI settings",
      },
      {
        name: "Batch Jobs",
        href: "/admin/batch-jobs",
        icon: Clock,
        description: "Job queue",
      },
      {
        name: "Workflows",
        href: "/admin/workflows",
        icon: Workflow,
        description: "System workflows",
      },
    ],
  },
];

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Page Library</h1>
          <p className="text-zinc-400">
            Browse all available pages in the application
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold mb-4 text-zinc-300 border-b border-zinc-800 pb-2">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {section.pages.map((page) => (
                  <Link key={page.href} href={page.href}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                            <page.icon className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white truncate">
                                {page.name}
                              </h3>
                              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                              {page.description}
                            </p>
                            <p className="text-xs text-zinc-600 mt-1 truncate">
                              {page.href}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-zinc-600 text-sm">
          <p>
            Note: Some pages require authentication and proper team context.
          </p>
          <p>Replace "default" with your actual team slug in the URLs.</p>
        </div>
      </div>
    </div>
  );
}
