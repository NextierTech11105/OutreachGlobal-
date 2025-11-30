"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MoreHorizontal } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExtractNode, LeadKanbanQuery } from "@/graphql/types";
import { TeamLink } from "@/features/team/components/team-link";
import { LeadActions } from "./lead-actions";

interface LeadCardProps {
  lead: ExtractNode<LeadKanbanQuery["leads"]>;
}

export function LeadCard({ lead }: LeadCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Low":
        return "bg-blue-100 text-blue-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="h-full relative">
      <TeamLink href={`/leads/${lead.id}`} className="absolute inset-0 z-5" />
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-sm truncate">{lead.name}</h3>
          <div className="flex items-center gap-1 z-10">
            <LeadActions lead={lead} />
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontal />
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Lead Details</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{lead.name}</h3>
                    {!!lead.property && (
                      <p className="text-sm text-muted-foreground">
                        {lead.property.address?.street},{" "}
                        {lead.property.address?.city},{" "}
                        {lead.property.address?.state}{" "}
                        {lead.property.address?.zipCode}
                      </p>
                    )}

                    {lead.email && (
                      <div className="mt-2 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                    )}

                    {lead.phone && (
                      <div className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.phone}</span>
                      </div>
                    )}
                  </div>

                  {!!lead.property && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          Property Value:
                        </span>
                        <span className="text-sm">
                          {formatCurrency(
                            lead.property.assessedValue ||
                              lead.property.estimatedValue ||
                              0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          Property Type:
                        </span>
                        <span className="text-sm">{lead.property.type}</span>
                      </div>
                      {lead.property.buildingSquareFeet && (
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Square Feet:
                          </span>
                          <span className="text-sm">
                            {lead.property.buildingSquareFeet.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {lead.property.yearBuilt && (
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Year Built:
                          </span>
                          <span className="text-sm">
                            {lead.property.yearBuilt}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge>{lead.status}</Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Source:</span>
                    <span className="text-sm">{lead.source}</span>
                  </div>
                </div>

                {lead.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-1">Notes</h4>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                )}

                {lead.tags && lead.tags.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {!!lead.property && (
          <>
            <div className="text-xs text-muted-foreground mb-2 truncate">
              {lead.property.address?.street}, {lead.property.address?.city},{" "}
              {lead.property.address?.state} {lead.property.address?.zipCode}
            </div>

            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-medium">
                {formatCurrency(lead.property?.assessedValue || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {lead.property?.type}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
