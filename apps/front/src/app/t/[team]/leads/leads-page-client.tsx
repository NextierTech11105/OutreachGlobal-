"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Phone, Users } from "lucide-react";
import { LeadList } from "@/features/lead/components/lead-list";
import { CallQueueList } from "./call-queue-list";

type ViewMode = "all" | "call_queue";

export function LeadsPageClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  return (
    <div className="space-y-4">
      {/* Quick Filter Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Leads
          </TabsTrigger>
          <TabsTrigger value="call_queue" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Queue
            <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-700">
              New
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {viewMode === "all" ? <LeadList /> : <CallQueueList />}
    </div>
  );
}
