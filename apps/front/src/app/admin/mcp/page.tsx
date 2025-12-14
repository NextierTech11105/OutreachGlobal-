"use client";

import { MCPDashboard } from "@/components/admin/mcp-dashboard";
import { LeadTrackerSimple } from "@/components/admin/lead-tracker-simple";
import { DetailEnrichment } from "@/components/admin/detail-enrichment";
import { OpportunityPulse } from "@/components/admin/opportunity-pulse";
import { GiannaMatrixAgent } from "@/components/admin/gianna-matrix-agent";
import { DatalakeCopilot } from "@/components/admin/datalake-copilot";
import { LeadManagerHub } from "@/components/admin/lead-manager-hub";
import { LuciDataAgent } from "@/components/admin/luci-data-agent";
import { CathyNudger } from "@/components/admin/cathy-nudger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Cable,
  Database,
  LayoutDashboard,
  Target,
  ExternalLink,
  Zap,
  Bot,
  MessageSquare,
  Globe,
  Layers,
  Bell,
  ArrowRight,
  TrendingUp,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Agent descriptions for clarity
const AGENT_INFO = {
  "lead-manager": {
    name: "Lead Manager Hub",
    tagline: "YOUR COMMAND CENTER",
    description: "View all leads, filter by status, push to campaigns. Start here.",
    color: "emerald",
    icon: Layers,
  },
  gianna: {
    name: "Gianna AI",
    tagline: "AUTO-REPLY BOT",
    description: "Responds to inbound SMS. Confirms appointments. Books calls.",
    color: "pink",
    icon: Bot,
  },
  luci: {
    name: "Luci Data Agent",
    tagline: "FETCH NEW LEADS",
    description: "Search business databases. Find decision-makers. Export to calendar.",
    color: "red",
    icon: Globe,
  },
  copilot: {
    name: "Datalake Copilot",
    tagline: "ASK QUESTIONS",
    description: "Natural language search across all your data. Just ask.",
    color: "cyan",
    icon: MessageSquare,
  },
  leads: {
    name: "ID Search",
    tagline: "FIND BY ID/PHONE",
    description: "Quick lookup by lead ID or phone number. Instant results.",
    color: "purple",
    icon: Target,
  },
  enrich: {
    name: "Enrichment Center",
    tagline: "ADD CONTACT INFO",
    description: "Skip trace addresses. Get phones/emails. Apollo enrichment.",
    color: "cyan",
    icon: Database,
  },
  b2b: {
    name: "B2B Advisor",
    tagline: "FIND OPPORTUNITIES",
    description: "AI-scored business leads. Property ownership signals.",
    color: "orange",
    icon: Zap,
  },
  connections: {
    name: "MCP Connections",
    tagline: "API STATUS",
    description: "View all connected data sources. Check API health.",
    color: "purple",
    icon: LayoutDashboard,
  },
  cathy: {
    name: "Cathy Nudger",
    tagline: "AUTO FOLLOW-UP",
    description: "Automated nudge sequences for non-responders. Set thresholds.",
    color: "amber",
    icon: Bell,
  },
};

export default function MCPPage() {
  const [activeTab, setActiveTab] = useState("lead-manager");

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      {/* HEADER - STATUS BAR STYLE */}
      <div className="border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl shadow-lg shadow-purple-500/20">
              <Cable className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">AGENT CONTROL CENTER</h1>
              <p className="text-zinc-500 text-sm font-medium">Model Context Protocol • Data Orchestration</p>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Active Agents</div>
              <div className="text-2xl font-black text-green-400">4</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Data Sources</div>
              <div className="text-2xl font-black text-blue-400">12</div>
            </div>
            <Link href="/t/test/calendar">
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold px-6">
                <Phone className="h-4 w-4 mr-2" />
                CALENDAR
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* WORKFLOW HINT BAR */}
        <div className="px-4 pb-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center gap-4">
            <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 font-bold">WORKFLOW</Badge>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-red-400 font-semibold">Luci</span>
              <ArrowRight className="h-3 w-3" />
              <span>fetches leads</span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-cyan-400 font-semibold">Enrich</span>
              <ArrowRight className="h-3 w-3" />
              <span>add phones</span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-emerald-400 font-semibold">Calendar</span>
              <ArrowRight className="h-3 w-3" />
              <span>make calls</span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-pink-400 font-semibold">Gianna</span>
              <ArrowRight className="h-3 w-3" />
              <span>auto-replies</span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-amber-400 font-semibold">Cathy</span>
              <ArrowRight className="h-3 w-3" />
              <span>follows up</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* TAB SELECTOR - VISUAL CARDS */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 mb-6">
            {Object.entries(AGENT_INFO).map(([key, info]) => {
              const Icon = info.icon;
              const isActive = activeTab === key;
              const colorClass = {
                emerald: isActive ? "bg-emerald-600 border-emerald-500" : "border-emerald-600/30 hover:border-emerald-600",
                pink: isActive ? "bg-pink-600 border-pink-500" : "border-pink-600/30 hover:border-pink-600",
                red: isActive ? "bg-red-600 border-red-500" : "border-red-600/30 hover:border-red-600",
                cyan: isActive ? "bg-cyan-600 border-cyan-500" : "border-cyan-600/30 hover:border-cyan-600",
                purple: isActive ? "bg-purple-600 border-purple-500" : "border-purple-600/30 hover:border-purple-600",
                orange: isActive ? "bg-orange-600 border-orange-500" : "border-orange-600/30 hover:border-orange-600",
                amber: isActive ? "bg-amber-600 border-amber-500" : "border-amber-600/30 hover:border-amber-600",
              }[info.color];

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`p-3 rounded-xl border-2 transition-all ${colorClass} ${
                    isActive ? "shadow-lg scale-105" : "bg-zinc-900/50 hover:bg-zinc-900"
                  }`}
                >
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${isActive ? "text-white" : "text-zinc-400"}`} />
                  <div className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-white" : "text-zinc-500"}`}>
                    {info.name.split(" ")[0]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CURRENT TAB INFO CARD */}
          <Card className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {(() => {
                    const info = AGENT_INFO[activeTab as keyof typeof AGENT_INFO];
                    const Icon = info.icon;
                    return (
                      <>
                        <div className={`p-3 rounded-xl bg-${info.color}-600/20 border border-${info.color}-600/30`}>
                          <Icon className={`h-6 w-6 text-${info.color}-400`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black">{info.name}</h2>
                            <Badge variant="outline" className="text-xs font-bold">
                              {info.tagline}
                            </Badge>
                          </div>
                          <p className="text-zinc-400 text-sm mt-1">{info.description}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                    ACTIVE
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HIDDEN TAB LIST FOR ACCESSIBILITY */}
          <TabsList className="hidden">
            {Object.keys(AGENT_INFO).map((key) => (
              <TabsTrigger key={key} value={key}>{key}</TabsTrigger>
            ))}
          </TabsList>

          {/* TAB CONTENTS */}
          <TabsContent value="lead-manager" className="mt-0">
            <LeadManagerHub />
          </TabsContent>

          <TabsContent value="gianna" className="mt-0">
            <GiannaMatrixAgent />
          </TabsContent>

          <TabsContent value="luci" className="mt-0">
            <LuciDataAgent />
          </TabsContent>

          <TabsContent value="copilot" className="mt-0">
            <DatalakeCopilot />
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            <LeadTrackerSimple />
          </TabsContent>

          <TabsContent value="enrich" className="mt-0">
            <DetailEnrichment />
          </TabsContent>

          <TabsContent value="b2b" className="mt-0">
            <OpportunityPulse />
          </TabsContent>

          <TabsContent value="connections" className="mt-0">
            <MCPDashboard />
          </TabsContent>

          <TabsContent value="cathy" className="mt-0">
            <CathyNudger />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
