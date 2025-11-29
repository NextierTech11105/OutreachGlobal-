"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MoreVertical, User, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Contact {
  id: string;
  name: string;
  phone: string;
  phoneLineType?: string;
  phoneCarrier?: string;
  company: string;
  position: string;
  location: string;
  source: string;
  status: string;
  tags: string[];
  lastContact: string;
  avatar: string;
}

interface ContactsListProps {
  onStartCall: (contact: Contact) => void;
  onStartConference?: (contacts: Contact[]) => void;
  searchQuery?: string;
  showAllDetails?: boolean;
}

export function ContactsList({
  onStartCall,
  onStartConference,
  searchQuery = "",
  showAllDetails = false,
}: ContactsListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Mock data - in a real app, this would come from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockContacts: Contact[] = [];

      setContacts(mockContacts);
      setFilteredContacts(mockContacts);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter contacts based on search query and filters
  useEffect(() => {
    let filtered = [...contacts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.company.toLowerCase().includes(query) ||
          contact.phone.includes(query) ||
          contact.location.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((contact) => contact.status === statusFilter);
    }

    // Apply source filter
    if (sourceFilter) {
      filtered = filtered.filter((contact) => contact.source === sourceFilter);
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, statusFilter, sourceFilter]);

  // Get unique statuses for filter (filter out empty strings to avoid Radix Select error)
  const uniqueStatuses = Array.from(
    new Set(contacts.map((contact) => contact.status)),
  ).filter((status) => status && status.trim() !== "");

  // Get unique sources for filter (filter out empty strings to avoid Radix Select error)
  const uniqueSources = Array.from(
    new Set(contacts.map((contact) => contact.source)),
  ).filter((source) => source && source.trim() !== "");

  const toggleContactSelection = (contact: Contact) => {
    if (selectedContacts.some((c) => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const isContactSelected = (contactId: string) => {
    return selectedContacts.some((c) => c.id === contactId);
  };

  const handleStartConference = () => {
    if (onStartConference && selectedContacts.length > 0) {
      onStartConference(selectedContacts);
      setSelectedContacts([]);
      setSelectionMode(false);
    }
  };

  const getLineTypeBadgeColor = (lineType: string | undefined) => {
    switch (lineType) {
      case "mobile":
        return "bg-green-100 text-green-800";
      case "landline":
        return "bg-blue-100 text-blue-800";
      case "voip":
        return "bg-purple-100 text-purple-800";
      case "toll_free":
        return "bg-yellow-100 text-yellow-800";
      case "premium":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading contacts...
          </p>
        </div>
      </div>
    );
  }

  if (filteredContacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">No contacts found</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {showAllDetails ? (
          // Detailed table view
          <>
            <div className="p-4 flex flex-wrap gap-2 border-b">
              <Select
                value={statusFilter || ""}
                onValueChange={(value) => setStatusFilter(value || null)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sourceFilter || ""}
                onValueChange={(value) => setSourceFilter(value || null)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {uniqueSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-2">
                {selectionMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectionMode(false);
                        setSelectedContacts([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleStartConference}
                      disabled={selectedContacts.length === 0}
                    >
                      Start Conference ({selectedContacts.length})
                    </Button>
                  </>
                ) : (
                  onStartConference && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectionMode(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Conference Mode
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Phone Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className={
                        selectionMode && isContactSelected(contact.id)
                          ? "bg-muted/50"
                          : ""
                      }
                      onClick={() =>
                        selectionMode && toggleContactSelection(contact)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {selectionMode && (
                            <input
                              type="checkbox"
                              checked={isContactSelected(contact.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleContactSelection(contact);
                              }}
                              className="h-4 w-4"
                            />
                          )}
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={contact.avatar || "/placeholder.svg"}
                              alt={contact.name}
                            />
                            <AvatarFallback>
                              {contact.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {contact.position}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>
                        {contact.phoneLineType && (
                          <Badge
                            variant="outline"
                            className={getLineTypeBadgeColor(
                              contact.phoneLineType,
                            )}
                          >
                            {contact.phoneLineType.charAt(0).toUpperCase() +
                              contact.phoneLineType.slice(1)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{contact.company}</TableCell>
                      <TableCell>{contact.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {contact.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{contact.source}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onStartCall(contact)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Edit Contact</DropdownMenuItem>
                              <DropdownMenuItem>
                                Add to Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem>View History</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          // Compact list view for dialer
          <ScrollArea className="h-[500px]">
            {onStartConference && (
              <div className="p-4 flex justify-between items-center border-b">
                {selectionMode ? (
                  <>
                    <span className="text-sm font-medium">
                      Select contacts for conference call (
                      {selectedContacts.length} selected)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectionMode(false);
                          setSelectedContacts([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleStartConference}
                        disabled={selectedContacts.length === 0}
                      >
                        Start Conference
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectionMode(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Conference Mode
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1 p-1">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors ${
                    selectionMode && isContactSelected(contact.id)
                      ? "bg-muted/50"
                      : ""
                  }`}
                  onClick={() =>
                    selectionMode && toggleContactSelection(contact)
                  }
                >
                  <div className="flex items-center space-x-3">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={isContactSelected(contact.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleContactSelection(contact);
                        }}
                        className="h-4 w-4"
                      />
                    )}
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={contact.avatar || "/placeholder.svg"}
                        alt={contact.name}
                      />
                      <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {contact.phone}
                        {contact.phoneLineType && (
                          <Badge
                            variant="outline"
                            className={`ml-2 text-xs ${getLineTypeBadgeColor(contact.phoneLineType)}`}
                          >
                            {contact.phoneLineType.charAt(0).toUpperCase() +
                              contact.phoneLineType.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {contact.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {contact.company}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onStartCall(contact)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
