"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { arrayMove, cn } from "@/lib/utils";
import { gql, TypedDocumentNode, useMutation, useQuery } from "@apollo/client";
import {
  ExtractNode,
  LeadKanbanQuery,
  LeadKanbanQueryVariables,
} from "@/graphql/types";
import { useCurrentTeam } from "@/features/team/team.context";
import { LeadCard } from "./lead-card";
import { UPDATE_LEAD_POSITION_MUTATION } from "../mutations/lead.mutations";

const QUERY: TypedDocumentNode<LeadKanbanQuery, LeadKanbanQueryVariables> = gql`
  query LeadKanban($teamId: ID!) {
    leadStatuses(teamId: $teamId) {
      id
    }
    leads(teamId: $teamId, first: 100) {
      edges {
        node {
          id
          status
          name
          phone
          email
          source
          notes
          tags
          position
          createdAt
          updatedAt
          property {
            id
            address
            type
            assessedValue
            estimatedValue
            buildingSquareFeet
            lotSquareFeet
            yearBuilt
            ownerOccupied
            ownerFirstName
            ownerLastName
            useCode
          }
        }
      }
    }
  }
`;

export function LeadKanban() {
  const { teamId, isTeamReady } = useCurrentTeam();
  const { data, loading } = useQuery(QUERY, {
    variables: {
      teamId,
    },
    skip: !isTeamReady,
  });

  const [filteredLeads, setFilteredLeads] = useState<
    ExtractNode<LeadKanbanQuery["leads"]>[]
  >([]);

  const [updateLeadPosition] = useMutation(UPDATE_LEAD_POSITION_MUTATION);

  const statuses = useMemo(() => {
    const values = data?.leadStatuses.map((status) => status.id) || [];
    return [...values, "NO_STATUS"];
  }, [data?.leadStatuses]);

  // Handle drag and drop
  const onDragEnd = (result: DropResult) => {
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
    const lead = filteredLeads.find((lead) => lead.id === draggableId);
    if (!lead) return;

    if (destination.droppableId !== source.droppableId) {
      // Create a new array with the updated lead status
      const updatedLeads = [...filteredLeads].map((l) => {
        if (l.id === draggableId) {
          return {
            ...l,
            status: destination.droppableId,
            updatedAt: new Date().toISOString(),
            position: destination.index,
          };
        }
        return l;
      });

      updatedLeads.sort((a, b) => {
        return a.position - b.position;
      });

      setFilteredLeads(updatedLeads);
      updateLeadPosition({
        variables: {
          teamId,
          id: lead.id,
          newPosition: destination.index,
          oldPosition: source.index,
          status: destination.droppableId,
        },
      });
    } else {
      const newLeads = arrayMove(
        filteredLeads,
        source.index,
        destination.index,
      );
      setFilteredLeads(newLeads);
      updateLeadPosition({
        variables: {
          teamId,
          id: lead.id,
          newPosition: destination.index,
          oldPosition: source.index,
          status: destination.droppableId,
        },
      });
    }
  };

  useEffect(() => {
    const leads = data?.leads.edges.map((edge) => edge.node) || [];
    const newLeads = [...leads];
    newLeads.sort((a, b) => {
      return a.position - b.position;
    });
    setFilteredLeads(newLeads);
  }, [data?.leads]);

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
    <div className="overflow-x-auto">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 pb-4">
          {statuses.map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex flex-nowrap flex-col rounded-lg border min-h-[500px]",
                    snapshot.isDraggingOver ? "bg-muted/50" : "bg-background",
                  )}
                >
                  <div className="p-3 font-medium border-b sticky top-0 bg-background z-10">
                    <div className="flex items-center justify-between">
                      <span>{status}</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">
                        {
                          filteredLeads.filter(
                            (lead) => (lead.status || "NO_STATUS") === status,
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                  <div className="p-2 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                    {filteredLeads
                      .filter((lead) => (lead.status || "NO_STATUS") === status)
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
    </div>
  );
}
