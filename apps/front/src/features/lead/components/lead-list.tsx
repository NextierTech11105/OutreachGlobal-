"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanSquare, List, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { LeadsFilter } from "./lead-filters";
import { LeadKanban } from "./lead-kanban";
import { LeadTable } from "./lead-table";
import { LeadCards } from "./lead-cards";

export const LeadList = () => {
  const [view, setView] = useState<"kanban" | "table" | "cards">("table");
  const [filters, setFilters] = useState<any>({});

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <LeadsFilter filters={filters} setFilters={setFilters} />
        <div className="flex items-center space-x-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "kanban" | "table" | "cards")}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <KanbanSquare className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === "kanban" && <LeadKanban />}
      {view === "table" && <LeadTable />}
      {view === "cards" && <LeadCards />}
    </div>
  );
};
