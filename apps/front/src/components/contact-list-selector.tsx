"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Filter,
  Upload,
  Download,
  Users,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface ContactList {
  id: string;
  name: string;
  description: string;
  count: number;
  source: string;
  tags: string[];
  lastUpdated: string;
}

interface ContactListSelectorProps {
  onSelectList: (listId: string, count: number) => void;
  selectedListId?: string;
}

export function ContactListSelector({
  onSelectList,
  selectedListId,
}: ContactListSelectorProps) {
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [filteredLists, setFilteredLists] = useState<ContactList[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [previewContacts, setPreviewContacts] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Mock data - in a real app, this would come from an API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockLists: ContactList[] = [
        {
          id: "list-001",
          name: "High Equity Homeowners",
          description: "Homeowners with 70%+ equity in their properties",
          count: 1875,
          source: "Property Database",
          tags: ["high-equity", "homeowner"],
          lastUpdated: "2025-05-01",
        },
        {
          id: "list-002",
          name: "Pre-Foreclosure Properties",
          description: "Properties in pre-foreclosure status",
          count: 943,
          source: "County Records",
          tags: ["pre-foreclosure", "distressed"],
          lastUpdated: "2025-05-03",
        },
        {
          id: "list-003",
          name: "Commercial Property Owners",
          description: "Owners of commercial properties in target areas",
          count: 612,
          source: "Commercial Database",
          tags: ["commercial", "business-owner"],
          lastUpdated: "2025-05-05",
        },
        {
          id: "list-004",
          name: "Vacant Properties",
          description: "Properties identified as vacant for 6+ months",
          count: 528,
          source: "Utility Data",
          tags: ["vacant", "opportunity"],
          lastUpdated: "2025-05-07",
        },
        {
          id: "list-005",
          name: "Senior Homeowners",
          description: "Homeowners aged 65+ in target neighborhoods",
          count: 2134,
          source: "Demographic Data",
          tags: ["senior", "homeowner"],
          lastUpdated: "2025-05-09",
        },
        {
          id: "list-006",
          name: "Recent Website Inquiries",
          description: "Leads who submitted inquiries on our website",
          count: 347,
          source: "Website",
          tags: ["warm-lead", "inquiry"],
          lastUpdated: "2025-05-10",
        },
        {
          id: "list-007",
          name: "Expired Listings",
          description: "Properties with recently expired listings",
          count: 789,
          source: "MLS Data",
          tags: ["expired", "opportunity"],
          lastUpdated: "2025-05-12",
        },
      ];

      setContactLists(mockLists);
      setFilteredLists(mockLists);
      setLoading(false);

      // If there's a selectedListId, set it as selected
      if (selectedListId) {
        const selected = mockLists.find((list) => list.id === selectedListId);
        if (selected) {
          setSelectedList(selected);
          loadPreviewContacts(selected.id);
        }
      }
    }, 1000);
  }, [selectedListId]);

  // Filter lists based on search query and filters
  useEffect(() => {
    let filtered = [...contactLists];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (list) =>
          list.name.toLowerCase().includes(query) ||
          list.description.toLowerCase().includes(query) ||
          list.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Apply source filter
    if (sourceFilter) {
      filtered = filtered.filter((list) => list.source === sourceFilter);
    }

    setFilteredLists(filtered);
  }, [contactLists, searchQuery, sourceFilter]);

  // Get unique sources for filter
  const uniqueSources = Array.from(
    new Set(contactLists.map((list) => list.source)),
  );

  const handleSelectList = (list: ContactList) => {
    setSelectedList(list);
    onSelectList(list.id, list.count);
    loadPreviewContacts(list.id);
  };

  const loadPreviewContacts = (listId: string) => {
    setPreviewLoading(true);
    // Simulate API call to get preview contacts
    setTimeout(() => {
      const mockPreviewContacts = [
        {
          name: "John Smith",
          phone: "(555) 123-4567",
          address: "123 Main St, New York, NY",
          tags: ["high-equity", "homeowner"],
        },
        {
          name: "Sarah Johnson",
          phone: "(555) 234-5678",
          address: "456 Oak Ave, Los Angeles, CA",
          tags: ["pre-foreclosure", "distressed"],
        },
        {
          name: "Michael Chen",
          phone: "(555) 345-6789",
          address: "789 Pine Rd, Chicago, IL",
          tags: ["high-equity", "senior"],
        },
        {
          name: "Emily Davis",
          phone: "(555) 456-7890",
          address: "101 Maple Dr, Miami, FL",
          tags: ["vacant", "opportunity"],
        },
        {
          name: "Robert Wilson",
          phone: "(555) 567-8901",
          address: "202 Cedar Ln, Dallas, TX",
          tags: ["commercial", "business-owner"],
        },
      ];
      setPreviewContacts(mockPreviewContacts);
      setPreviewLoading(false);
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading contact lists...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Contact List</h3>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lists..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={sourceFilter || "all"}
            onValueChange={(value) =>
              setSourceFilter(value === "all" ? null : value)
            }
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
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Available Contact Lists</CardTitle>
              <CardDescription>
                Select a list to use for your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 p-1">
                  {filteredLists.map((list) => (
                    <div
                      key={list.id}
                      className={`flex items-start justify-between p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer ${
                        selectedList?.id === list.id ? "bg-muted" : ""
                      }`}
                      onClick={() => handleSelectList(list)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{list.name}</div>
                          <Badge variant="outline">
                            {sf(list.count)} contacts
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {list.description}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Source: {list.source}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Updated: {list.lastUpdated}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {list.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedList?.id === list.id}
                        className="ml-2 mt-1"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4" />
                {filteredLists.length} lists available
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Import List
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>List Preview</CardTitle>
              <CardDescription>
                {selectedList
                  ? `Showing sample contacts from ${selectedList.name}`
                  : "Select a list to see preview"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedList ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No list selected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a contact list from the left to see a preview
                  </p>
                </div>
              ) : previewLoading ? (
                <div className="flex flex-col items-center justify-center h-[300px]">
                  <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading preview...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">List Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">
                        Total Contacts:
                      </div>
                      <div className="font-medium">
                        {sf(selectedList.count)}
                      </div>
                      <div className="text-muted-foreground">Source:</div>
                      <div>{selectedList.source}</div>
                      <div className="text-muted-foreground">Last Updated:</div>
                      <div>{selectedList.lastUpdated}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Sample Contacts
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Showing 5 of {selectedList.count}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {previewContacts.map((contact, index) => (
                        <div
                          key={index}
                          className="p-2 border rounded-md text-sm"
                        >
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-muted-foreground">
                            {contact.phone}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {contact.address}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contact.tags.map((tag: string) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t p-4">
              <Button
                className="w-full"
                disabled={!selectedList}
                onClick={() =>
                  selectedList &&
                  onSelectList(selectedList.id, selectedList.count)
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {selectedList ? `Select ${selectedList.name}` : "Select a List"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
