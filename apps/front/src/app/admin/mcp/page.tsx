"use client";

import { MCPDashboard } from "@/components/admin/mcp-dashboard";
import { MCPTerminal } from "@/components/admin/mcp-terminal";
import { MCPSavedSearches } from "@/components/admin/mcp-saved-searches";
import { LeadTrackerSimple } from "@/components/admin/lead-tracker-simple";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cable, Terminal, FolderOpen, LayoutDashboard, Target } from "lucide-react";

export default function MCPPage() {
  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="border-b border-zinc-800 p-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 rounded-lg">
            <Cable className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">MCP Command Center</h1>
            <p className="text-zinc-400 mt-1">
              Search properties, track leads, push to campaigns
            </p>
          </div>
        </div>
      </div>
      <div className="p-8">
        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="leads" className="data-[state=active]:bg-purple-600">
              <Target className="h-4 w-4 mr-2" />
              Lead Tracker
            </TabsTrigger>
            <TabsTrigger value="terminal" className="data-[state=active]:bg-purple-600">
              <Terminal className="h-4 w-4 mr-2" />
              Quick Search
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-purple-600">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Connections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-0">
            <LeadTrackerSimple />
          </TabsContent>

          <TabsContent value="terminal" className="mt-0">
            <MCPTerminal />
          </TabsContent>

          <TabsContent value="connections" className="mt-0">
            <MCPDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
