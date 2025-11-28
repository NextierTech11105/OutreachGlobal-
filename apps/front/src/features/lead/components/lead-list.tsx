"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanSquare, List } from "lucide-react";
import { useState } from "react";
import { LeadsFilter } from "./lead-filters";
import { LeadKanban } from "./lead-kanban";
import { LeadTable } from "./lead-table";

export const LeadList = () => {
  const [view, setView] = useState("kanban");
  const [filters, setFilters] = useState<any>({});

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <LeadsFilter filters={filters} setFilters={setFilters} />
        <div className="flex items-center space-x-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "kanban" | "table")}
            className="w-[400px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <KanbanSquare className="h-4 w-4" />
                <span>Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span>Table</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === "kanban" ? <LeadKanban /> : <LeadTable />}
    </div>
  );
};
