"use client";

import type { Lead } from "@/types/lead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageSquare, MoreHorizontal } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

interface LeadCardProps {
  lead: Lead;
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
    <>
      <Link
        href={`/leads/${lead.id}`}
        className="block transition-all hover:shadow-md"
      >
        <Card className="h-full">
          <CardContent className="p-3">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm truncate">{lead.name}</h3>
              <Badge
                variant="outline"
                className={`text-xs ${getPriorityColor(lead.priority)}`}
              >
                {lead.priority}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground mb-2 truncate">
              {lead.address}, {lead.city}, {lead.state} {lead.zipCode}
            </div>

            <div className="flex justify-between items-center mb-3">
              <div className="text-sm font-medium">
                {formatCurrency(lead.propertyValue)}
              </div>
              <div className="text-xs text-muted-foreground">
                {lead.propertyType}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  title="Email"
                >
                  <Mail className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  title="Call"
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  title="SMS"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
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
                        <p className="text-sm text-muted-foreground">
                          {lead.address}, {lead.city}, {lead.state}{" "}
                          {lead.zipCode}
                        </p>

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

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Property Value:
                          </span>
                          <span className="text-sm">
                            {formatCurrency(lead.propertyValue)}
                          </span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Property Type:
                          </span>
                          <span className="text-sm">{lead.propertyType}</span>
                        </div>
                        {lead.bedrooms && (
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">
                              Bedrooms:
                            </span>
                            <span className="text-sm">{lead.bedrooms}</span>
                          </div>
                        )}
                        {lead.bathrooms && (
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">
                              Bathrooms:
                            </span>
                            <span className="text-sm">{lead.bathrooms}</span>
                          </div>
                        )}
                        {lead.squareFeet && (
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">
                              Square Feet:
                            </span>
                            <span className="text-sm">
                              {lead.squareFeet.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {lead.yearBuilt && (
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">
                              Year Built:
                            </span>
                            <span className="text-sm">{lead.yearBuilt}</span>
                          </div>
                        )}
                      </div>
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
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Priority:</span>
                        <Badge className={getPriorityColor(lead.priority)}>
                          {lead.priority}
                        </Badge>
                      </div>
                      {lead.assignedTo && (
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Assigned To:
                          </span>
                          <span className="text-sm">{lead.assignedTo}</span>
                        </div>
                      )}
                      {lead.lastContactDate && (
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Last Contact:
                          </span>
                          <span className="text-sm">
                            {new Date(
                              lead.lastContactDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {lead.nextFollowUp && (
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            Next Follow-up:
                          </span>
                          <span className="text-sm">
                            {new Date(lead.nextFollowUp).toLocaleDateString()}
                          </span>
                        </div>
                      )}
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
                    <Button
                      variant="outline"
                      onClick={() => setShowDetails(false)}
                    >
                      Close
                    </Button>
                    <Button>Edit Lead</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </Link>
    </>
  );
}
