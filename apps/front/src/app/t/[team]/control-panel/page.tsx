"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Plug,
  Home,
  BookOpen,
  FolderOpen,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Map,
  Database,
  MessageSquare,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ToolCard {
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  status: "active" | "coming-soon";
  features: string[];
  color: string;
}

export default function ControlPanelPage() {
  const params = useParams<{ team: string }>();
  const team = params.team;

  const tools: ToolCard[] = [
    {
      name: "Integrations",
      description: "Manage API connections and service status",
      href: `/${team}/integrations`,
      icon: Plug,
      status: "active",
      features: [
        "SignalHouse SMS",
        "Twilio Voice",
        "Apollo Enrichment",
        "Real Estate API",
      ],
      color: "text-blue-600",
    },
    {
      name: "Property Valuation",
      description: "AI-powered property analysis with comparables",
      href: `/${team}/valuation`,
      icon: DollarSign,
      status: "active",
      features: [
        "Real Estate API",
        "Mapbox Maps",
        "Skip Trace",
        "Equity Analysis",
      ],
      color: "text-green-600",
    },
    {
      name: "Content Library",
      description: "Prompts, templates, and scripts for AI workers",
      href: `/${team}/library`,
      icon: BookOpen,
      status: "active",
      features: [
        "AI Prompts",
        "SMS Templates",
        "Email Scripts",
        "Code Snippets",
      ],
      color: "text-purple-600",
    },
    {
      name: "Research Library",
      description: "Saved valuation reports and property research",
      href: `/${team}/research-library`,
      icon: FolderOpen,
      status: "active",
      features: [
        "Folder Organization",
        "Saved Reports",
        "Share Links",
        "Quick Access",
      ],
      color: "text-amber-600",
    },
  ];

  const quickLinks = [
    { name: "Companies", href: `/${team}/companies`, icon: Building2 },
    { name: "Territories", href: `/${team}/territories`, icon: Map },
    {
      name: "Digital Workers",
      href: `/${team}/digital-workers`,
      icon: Sparkles,
    },
    { name: "Reports", href: `/${team}/reports`, icon: Database },
    { name: "Inbox", href: `/${team}/inbox`, icon: MessageSquare },
    { name: "Call Center", href: `/${team}/call-center`, icon: Phone },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Panel</h1>
          <p className="text-muted-foreground">
            Core tools and integrations for your outreach operations
          </p>
        </div>
        <Link href={`/${team}/settings`}>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Active Tools Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.name} href={tool.href}>
                <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors`}
                        >
                          <Icon className={`h-6 w-6 ${tool.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {tool.name}
                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardTitle>
                          <CardDescription>{tool.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tool.features.map((feature) => (
                        <Badge
                          key={feature}
                          variant="secondary"
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.name} href={link.href}>
                <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Icon className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">{link.name}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Status</CardTitle>
          <CardDescription>All services are operational</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">SignalHouse SMS</p>
                <p className="text-xs text-muted-foreground">10DLC Ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">Twilio Voice</p>
                <p className="text-xs text-muted-foreground">Webhooks Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">Real Estate API</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">Mapbox</p>
                <p className="text-xs text-muted-foreground">Maps Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
