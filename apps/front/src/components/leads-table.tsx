"use client";

import { useState } from "react";
import type { Lead, LeadStatus } from "@/types/lead";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Phone,
  MessageSquare,
  MoreHorizontal,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { LeadCard } from "@/components/lead-card";
import Link from "next/link";

interface LeadsTableProps {
  leads: Lead[];
  setLeads: (leads: Lead[]) => void;
}

export function LeadsTable({ leads, setLeads }: LeadsTableProps) {
  const [sortField, setSortField] = useState<keyof Lead>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    const updatedLeads = leads.map((lead) => {
      if (lead.id === leadId) {
        return {
          ...lead,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return lead;
    });

    setLeads(updatedLeads);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <Button
                variant="ghost"
                onClick={() => handleSort("name")}
                className="flex items-center gap-1 p-0 h-auto font-medium"
              >
                Name
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("propertyValue")}
                className="flex items-center gap-1 p-0 h-auto font-medium"
              >
                Property Value
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Address</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("status")}
                className="flex items-center gap-1 p-0 h-auto font-medium"
              >
                Status
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("priority")}
                className="flex items-center gap-1 p-0 h-auto font-medium"
              >
                Priority
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {lead.name}
                </Link>
              </TableCell>
              <TableCell>{formatCurrency(lead.propertyValue)}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {lead.address}, {lead.city}, {lead.state} {lead.zipCode}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-1 p-1 h-auto"
                    >
                      <Badge variant="outline">{lead.status}</Badge>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(lead.id, "New")}
                    >
                      New
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(lead.id, "Contacted")}
                    >
                      Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(lead.id, "Qualified")}
                    >
                      Qualified
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(lead.id, "Proposal")}
                    >
                      Proposal
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(lead.id, "Negotiation")}
                    >
                      Negotiation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(lead.id, "Closed Won")}
                    >
                      Closed Won
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(lead.id, "Closed Lost")}
                    >
                      Closed Lost
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`
                    ${lead.priority === "Low" ? "bg-blue-100 text-blue-800" : ""}
                    ${lead.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : ""}
                    ${lead.priority === "High" ? "bg-orange-100 text-orange-800" : ""}
                    ${lead.priority === "Urgent" ? "bg-red-100 text-red-800" : ""}
                  `}
                >
                  {lead.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Email"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Call"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="SMS"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      {selectedLead && (
                        <>
                          <DialogHeader>
                            <DialogTitle>Lead Details</DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <LeadCard lead={selectedLead} />
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
