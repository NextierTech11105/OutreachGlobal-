"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpDown,
  ChevronDown,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock lead data
const mockLeads = [
  {
    id: "LEAD-001",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "(212) 555-1234",
    address: "123 Main St, Queens, NY 11101",
    status: "engaged",
    score: 35,
    tags: ["HighEquity", "PreForeclosure"],
    lastActivity: "May 8, 2025 - 10:23 AM",
  },
  {
    id: "LEAD-002",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "(718) 555-5678",
    address: "456 Park Ave, Brooklyn, NY 11201",
    status: "contacted",
    score: 28,
    tags: ["SeniorOwner"],
    lastActivity: "May 8, 2025 - 9:15 AM",
  },
  {
    id: "LEAD-003",
    name: "Michael Chen",
    email: "mchen@example.com",
    phone: "(917) 555-9012",
    address: "789 Broadway, Manhattan, NY 10001",
    status: "new",
    score: 42,
    tags: ["HighEquity", "VacantProp"],
    lastActivity: "May 7, 2025 - 4:30 PM",
  },
  {
    id: "LEAD-004",
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    phone: "(347) 555-3456",
    address: "321 Ocean Ave, Brooklyn, NY 11235",
    status: "converted",
    score: 38,
    tags: ["PreForeclosure"],
    lastActivity: "May 7, 2025 - 2:45 PM",
  },
  {
    id: "LEAD-005",
    name: "David Kim",
    email: "dkim@example.com",
    phone: "(646) 555-7890",
    address: "654 5th Ave, Queens, NY 11106",
    status: "contacted",
    score: 31,
    tags: ["LowEquity"],
    lastActivity: "May 7, 2025 - 10:00 AM",
  },
  {
    id: "LEAD-006",
    name: "Jessica Martinez",
    email: "jmartinez@example.com",
    phone: "(212) 555-2345",
    address: "987 West St, Manhattan, NY 10014",
    status: "new",
    score: 25,
    tags: ["NonOccupant"],
    lastActivity: "May 6, 2025 - 3:15 PM",
  },
  {
    id: "LEAD-007",
    name: "Robert Wilson",
    email: "rwilson@example.com",
    phone: "(718) 555-6789",
    address: "246 Eastern Pkwy, Brooklyn, NY 11238",
    status: "engaged",
    score: 33,
    tags: ["HighEquity"],
    lastActivity: "May 6, 2025 - 1:30 PM",
  },
  {
    id: "LEAD-008",
    name: "Lisa Thompson",
    email: "lthompson@example.com",
    phone: "(917) 555-0123",
    address: "135 Northern Blvd, Queens, NY 11101",
    status: "unresponsive",
    score: 22,
    tags: ["SeniorOwner", "LowEquity"],
    lastActivity: "May 6, 2025 - 11:45 AM",
  },
  {
    id: "LEAD-009",
    name: "James Brown",
    email: "jbrown@example.com",
    phone: "(347) 555-4567",
    address: "864 Fulton St, Brooklyn, NY 11217",
    status: "contacted",
    score: 29,
    tags: ["VacantProp"],
    lastActivity: "May 6, 2025 - 10:00 AM",
  },
  {
    id: "LEAD-010",
    name: "Amanda Lee",
    email: "alee@example.com",
    phone: "(646) 555-8901",
    address: "753 Queens Blvd, Queens, NY 11103",
    status: "new",
    score: 36,
    tags: ["HighEquity", "BuildableZoning"],
    lastActivity: "May 5, 2025 - 4:45 PM",
  },
];

interface CampaignLeadsListProps {
  campaignId: string;
}

export function CampaignLeadsList({ campaignId }: CampaignLeadsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Filter leads based on search query and status filter
  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch =
      searchQuery === "" ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === null || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const toggleSelectLead = (id: string) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter((leadId) => leadId !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="outline">New</Badge>;
      case "contacted":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Contacted
          </Badge>
        );
      case "engaged":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Engaged
          </Badge>
        );
      case "converted":
        return <Badge className="bg-green-500">Converted</Badge>;
      case "unresponsive":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700">
            Unresponsive
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) =>
              setStatusFilter(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="engaged">Engaged</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="unresponsive">Unresponsive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Leads
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle>Campaign Leads</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedLeads.length > 0 ? (
                <div className="flex items-center space-x-2">
                  <span>{selectedLeads.length} selected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLeads([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Send Message</DropdownMenuItem>
                      <DropdownMenuItem>Update Status</DropdownMenuItem>
                      <DropdownMenuItem>Add Tags</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        Remove from Campaign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                `${filteredLeads.length} leads`
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={
                        selectedLeads.length === filteredLeads.length &&
                        filteredLeads.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </div>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Score
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{lead.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{lead.address}</TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={lead.score >= 30 ? "default" : "outline-solid"}
                    >
                      {lead.score}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{lead.lastActivity}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Send Message</DropdownMenuItem>
                        <DropdownMenuItem>Update Status</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          Remove from Campaign
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
