"use client";

import { useState } from "react";
import { CampaignDirector } from "@/features/campaign/components/campaign-director";
import { CampaignBlocksBoard } from "@/features/campaign/components/campaign-blocks-board";
import { Button } from "@/components/ui/button";
import { Plus, Grid3X3, List } from "lucide-react";
import { TeamLink } from "@/features/team/components/team-link";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { TeamDescription } from "@/features/team/layouts/team-description";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = "blocks" | "table";

export default function CampaignsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("blocks");

  return (
    <TeamSection>
      <TeamHeader title="Campaigns" />

      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <div>
            <TeamTitle>Campaign Machine</TeamTitle>
            <TeamDescription>
              2,000 SMS blocks. 20,000/month pool. Push buttons, get results.
            </TeamDescription>
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <TabsList className="bg-zinc-800">
                <TabsTrigger
                  value="blocks"
                  className="gap-1.5 font-mono text-xs"
                >
                  <Grid3X3 className="h-4 w-4" />
                  BLOCKS
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className="gap-1.5 font-mono text-xs"
                >
                  <List className="h-4 w-4" />
                  LIST
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button asChild>
              <TeamLink href="/campaigns/create">
                <Plus className="mr-2 h-4 w-4" />
                New Block
              </TeamLink>
            </Button>
          </div>
        </div>

        {viewMode === "blocks" ? <CampaignBlocksBoard /> : <CampaignDirector />}
      </div>
    </TeamSection>
  );
}
