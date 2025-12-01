"use client";

import { MCPDashboard } from "@/components/admin/mcp-dashboard";
import { LeadTrackerSimple } from "@/components/admin/lead-tracker-simple";
import { DetailEnrichment } from "@/components/admin/detail-enrichment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Cable,
  Database,
  LayoutDashboard,
  Target,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function MCPPage() {
  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 rounded-lg">
              <Cable className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nextier Command Center</h1>
              <p className="text-zinc-400 text-sm">
                Search • Enrich • Track
              </p>
            </div>
          </div>
          <Link href="/t/test/properties">
            <Button variant="outline" className="bg-green-600 hover:bg-green-700 border-green-600">
              <ExternalLink className="h-4 w-4 mr-2" />
              Property Search
            </Button>
          </Link>
        </div>
      </div>
      <div className="p-6">
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="leads" className="data-[state=active]:bg-purple-600">
              <Target className="h-4 w-4 mr-2" />
              Lead Tracker
            </TabsTrigger>
            <TabsTrigger value="enrich" className="data-[state=active]:bg-cyan-600">
              <Database className="h-4 w-4 mr-2" />
              Enrichment
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-purple-600">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              MCP Connections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-0">
            <LeadTrackerSimple />
          </TabsContent>

          <TabsContent value="enrich" className="mt-0">
            <DetailEnrichment />
          </TabsContent>

          <TabsContent value="connections" className="mt-0">
            <MCPDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
