"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Lead, LeadStatus, LeadFilter } from "@/types/lead";
import { LeadCard } from "@/components/lead-card";
import { LeadsTable } from "@/components/leads-table";
import { LeadsFilter } from "@/components/leads-filter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanSquare, List } from "lucide-react";
import { toast } from "sonner";

export function LeadsKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<LeadFilter>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table">("kanban");

  // Statuses for the Kanban columns
  const statuses: LeadStatus[] = [
    "New",
    "Contacted",
    "Qualified",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
  ];

  // Fetch leads from REAL database API
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/leads?limit=200");
      const data = await response.json();

      if (data.error) {
        console.error("[Leads] API error:", data.error);
        // Don't show toast for auth errors on initial load
        if (!data.error.includes("Unauthorized")) {
          toast.error(data.error);
        }
        setLeads([]);
        setFilteredLeads([]);
        return;
      }

      setLeads(data.leads || []);
      setFilteredLeads(data.leads || []);
    } catch (error) {
      console.error("[Leads] Fetch error:", error);
      setLeads([]);
      setFilteredLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load leads from database on mount
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Apply filters
  useEffect(() => {
    let filtered = [...leads];

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((lead) =>
        filters.status?.includes(lead.status),
      );
    }

    // Apply source filter
    if (filters.source && filters.source.length > 0) {
      filtered = filtered.filter((lead) =>
        filters.source?.includes(lead.source),
      );
    }

    // Apply priority filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter((lead) =>
        filters.priority?.includes(lead.priority),
      );
    }

    // Apply property type filter
    if (filters.propertyType && filters.propertyType.length > 0) {
      filtered = filtered.filter((lead) =>
        filters.propertyType?.includes(lead.propertyType),
      );
    }

    // Apply property value range filter
    if (filters.minPropertyValue !== undefined) {
      filtered = filtered.filter(
        (lead) => lead.propertyValue >= (filters.minPropertyValue || 0),
      );
    }
    if (filters.maxPropertyValue !== undefined) {
      filtered = filtered.filter(
        (lead) =>
          lead.propertyValue <=
          (filters.maxPropertyValue || Number.POSITIVE_INFINITY),
      );
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((lead) =>
        lead.tags?.some((tag) => filters.tags?.includes(tag)),
      );
    }

    setFilteredLeads(filtered);
  }, [leads, filters]);

  // Handle drag and drop - Update status via REAL API
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If there's no destination or the item was dropped back in the same place
    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    // Find the lead that was dragged
    const lead = leads.find((lead) => lead.id === draggableId);
    if (!lead) return;

    const newStatus = destination.droppableId as LeadStatus;

    // Optimistically update state
    const updatedLeads = leads.map((l) => {
      if (l.id === draggableId) {
        return {
          ...l,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return l;
    });
    setLeads(updatedLeads);

    // Update the backend via REAL API
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: draggableId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        // Revert on failure
        setLeads(leads);
        toast.error("Failed to update lead status");
      }
    } catch (error) {
      console.error("[Leads] Status update error:", error);
      setLeads(leads);
      toast.error("Failed to update lead status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

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

      {view === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
            {statuses.map((status) => (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col rounded-lg border min-h-[500px] ${
                      snapshot.isDraggingOver ? "bg-muted/50" : "bg-background"
                    }`}
                  >
                    <div className="p-3 font-medium border-b sticky top-0 bg-background z-10">
                      <div className="flex items-center justify-between">
                        <span>{status}</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          {
                            filteredLeads.filter(
                              (lead) => lead.status === status,
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                      {filteredLeads
                        .filter((lead) => lead.status === status)
                        .map((lead, index) => (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 ${snapshot.isDragging ? "opacity-50" : ""}`}
                              >
                                <LeadCard lead={lead} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <LeadsTable leads={filteredLeads} setLeads={setLeads} />
      )}
    </div>
  );
}
