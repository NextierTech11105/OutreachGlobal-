"use client";

import { GiannaMatrixAgent } from "@/components/admin/gianna-matrix-agent";
import { DatalakeCopilot } from "@/components/admin/datalake-copilot";
import { LuciDataAgent } from "@/components/admin/luci-data-agent";
import { CathyNudger } from "@/components/admin/cathy-nudger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Cable,
  Database,
  Globe,
  Bell,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

// Pipeline agents in sequence
const AGENT_INFO = {
  datalake: {
    name: "Datalake",
    tagline: "DATA SOURCE",
    description:
      "Query your uploaded business lists. Search by keyword, sector, or location.",
    color: "cyan",
    icon: Database,
    step: 1,
  },
  luci: {
    name: "LUCI",
    tagline: "SEARCH & ENRICH",
    description:
      "Search keywords in lists, find decision makers, skip trace, push to campaigns.",
    color: "red",
    icon: Globe,
    step: 2,
  },
  gianna: {
    name: "Gianna",
    tagline: "INBOX MANAGER",
    description:
      "Manages inbound messages for all campaign numbers. Auto-replies and books calls.",
    color: "pink",
    icon: MessageSquare,
    step: 3,
  },
  cathy: {
    name: "Cathy",
    tagline: "FOLLOW-UP",
    description: "Nudges non-responders with automated follow-up sequences.",
    color: "amber",
    icon: Bell,
    step: 4,
  },
};

export default function MCPPage() {
  const [activeTab, setActiveTab] = useState("datalake");

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      {/* HEADER */}
      <div className="border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl shadow-lg shadow-purple-500/20">
              <Cable className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                OUTREACH PIPELINE
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                Data → Enrich → Campaign → Follow-up
              </p>
            </div>
          </div>
        </div>

        {/* PIPELINE FLOW */}
        <div className="px-4 pb-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              {Object.entries(AGENT_INFO).map(([key, info], index) => {
                const Icon = info.icon;
                const isActive = activeTab === key;
                const colorClasses: Record<string, string> = {
                  cyan: isActive
                    ? "text-cyan-400 border-cyan-400"
                    : "text-zinc-500 border-zinc-700",
                  red: isActive
                    ? "text-red-400 border-red-400"
                    : "text-zinc-500 border-zinc-700",
                  pink: isActive
                    ? "text-pink-400 border-pink-400"
                    : "text-zinc-500 border-zinc-700",
                  amber: isActive
                    ? "text-amber-400 border-amber-400"
                    : "text-zinc-500 border-zinc-700",
                };

                return (
                  <div key={key} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${colorClasses[info.color]} ${isActive ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${colorClasses[info.color]}`}
                      >
                        {info.step}
                      </span>
                      <Icon className="h-4 w-4" />
                      <span className="font-semibold">{info.name}</span>
                    </button>
                    {index < Object.keys(AGENT_INFO).length - 1 && (
                      <ArrowRight className="h-4 w-4 mx-3 text-zinc-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Current step info */}
          <Card className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {(() => {
                    const info =
                      AGENT_INFO[activeTab as keyof typeof AGENT_INFO];
                    if (!info) return null;
                    const Icon = info.icon;
                    const bgColors: Record<string, string> = {
                      cyan: "bg-cyan-600/20 border-cyan-600/30",
                      red: "bg-red-600/20 border-red-600/30",
                      pink: "bg-pink-600/20 border-pink-600/30",
                      amber: "bg-amber-600/20 border-amber-600/30",
                    };
                    const textColors: Record<string, string> = {
                      cyan: "text-cyan-400",
                      red: "text-red-400",
                      pink: "text-pink-400",
                      amber: "text-amber-400",
                    };
                    return (
                      <>
                        <div
                          className={`p-3 rounded-xl border ${bgColors[info.color]}`}
                        >
                          <Icon
                            className={`h-6 w-6 ${textColors[info.color]}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold ${textColors[info.color]} border-current`}
                            >
                              STEP {info.step}
                            </Badge>
                            <h2 className="text-xl font-black">{info.name}</h2>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium text-zinc-400"
                            >
                              {info.tagline}
                            </Badge>
                          </div>
                          <p className="text-zinc-400 text-sm mt-1">
                            {info.description}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hidden tab list for accessibility */}
          <TabsList className="hidden">
            {Object.keys(AGENT_INFO).map((key) => (
              <TabsTrigger key={key} value={key}>
                {key}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab contents - 4 steps in sequence */}
          <TabsContent value="datalake" className="mt-0">
            <DatalakeCopilot />
          </TabsContent>

          <TabsContent value="luci" className="mt-0">
            <LuciDataAgent />
          </TabsContent>

          <TabsContent value="gianna" className="mt-0">
            <GiannaMatrixAgent />
          </TabsContent>

          <TabsContent value="cathy" className="mt-0">
            <CathyNudger />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
