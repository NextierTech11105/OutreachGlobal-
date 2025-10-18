"use client";

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
import { Label } from "@/components/ui/label";
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
import { Search, Filter, Bot, User, Info } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: "ai" | "human";
  tags: string[];
  script: string;
  dispositions: string[];
}

interface CampaignSelectorProps {
  onSelectCampaign: (campaign: Campaign) => void;
  selectedCampaignId?: string;
}

export function CampaignSelector({
  onSelectCampaign,
  selectedCampaignId,
}: CampaignSelectorProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );

  // Load campaign definitions from JSON file
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        // In a real app, this would be an API call
        // For this example, we'll simulate loading from the JSON file
        const response = await fetch("/api/campaigns");
        const data = await response.json();
        setCampaigns(data.campaigns);
        setFilteredCampaigns(data.campaigns);
        setLoading(false);

        // If there's a selectedCampaignId, set it as selected
        if (selectedCampaignId) {
          const selected = data.campaigns.find(
            (campaign: Campaign) => campaign.id === selectedCampaignId,
          );
          if (selected) {
            setSelectedCampaign(selected);
          }
        }
      } catch (error) {
        console.error("Error loading campaigns:", error);
        // Fallback to mock data if API fails
        const mockCampaigns = [
          {
            id: "camp-001",
            name: "High Equity Outreach",
            description:
              "Target homeowners with high equity for investment opportunities",
            type: "ai",
            tags: ["high-equity", "investment", "homeowner"],
            script:
              "Hello {{firstName}}, this is {{agentName}} from OutreachGlobal. I noticed your property at {{address}} has significant equity built up. I'd like to discuss some investment opportunities that could benefit you. Do you have a few minutes to chat?",
            dispositions: [
              "Interested",
              "Not Interested",
              "Call Back",
              "Wrong Number",
              "Do Not Call",
            ],
          },
          {
            id: "camp-002",
            name: "Pre-Foreclosure Assistance",
            description:
              "Reach out to homeowners in pre-foreclosure to offer assistance",
            type: "ai",
            tags: ["pre-foreclosure", "assistance", "urgent"],
            script:
              "Hello {{firstName}}, I'm {{agentName}} with OutreachGlobal. I understand you might be facing some challenges with your property at {{address}}. We specialize in helping homeowners in pre-foreclosure situations find solutions. I'd like to share some options that might help you avoid foreclosure. Is this a good time to talk?",
            dispositions: [
              "Interested",
              "Not Interested",
              "Call Back",
              "Wrong Number",
              "Already Resolved",
              "Do Not Call",
            ],
          },
          {
            id: "camp-003",
            name: "Commercial Property Investment",
            description:
              "Target commercial property owners for investment partnerships",
            type: "human",
            tags: ["commercial", "investment", "partnership"],
            script:
              "Hello {{firstName}}, my name is {{agentName}} from OutreachGlobal. I'm reaching out regarding your commercial property at {{address}}. We're looking for investment partnerships in your area, and I believe your property has excellent potential. Would you be open to discussing some mutually beneficial opportunities?",
            dispositions: [
              "Interested",
              "Not Interested",
              "Call Back",
              "Wrong Number",
              "Not Owner",
              "Do Not Call",
            ],
          },
          {
            id: "camp-004",
            name: "Vacant Property Acquisition",
            description:
              "Contact owners of vacant properties for potential acquisition",
            type: "ai",
            tags: ["vacant", "acquisition", "cash-offer"],
            script:
              "Hi {{firstName}}, this is {{agentName}} with OutreachGlobal. I'm calling about your vacant property at {{address}}. We're actively acquiring properties in your area and can offer a straightforward cash purchase. Would you be interested in hearing more about our acquisition process?",
            dispositions: [
              "Interested",
              "Not Interested",
              "Call Back",
              "Wrong Number",
              "Not Vacant",
              "Already Sold",
              "Do Not Call",
            ],
          },
          {
            id: "camp-005",
            name: "Senior Homeowner Assistance",
            description:
              "Reach out to senior homeowners to offer specialized services",
            type: "human",
            tags: ["senior", "assistance", "retirement"],
            script:
              "Hello {{firstName}}, I'm {{agentName}} calling from OutreachGlobal. We specialize in helping senior homeowners like yourself with property-related decisions. Whether you're considering downsizing, need help with property maintenance, or want to explore options for your home at {{address}}, we have services designed specifically for your needs. Do you have a moment to discuss how we might be able to assist you?",
            dispositions: [
              "Interested",
              "Not Interested",
              "Call Back",
              "Wrong Number",
              "Not Senior Owner",
              "Do Not Call",
            ],
          },
        ];
        setCampaigns(mockCampaigns);
        setFilteredCampaigns(mockCampaigns);
        setLoading(false);

        // If there's a selectedCampaignId, set it as selected
        if (selectedCampaignId) {
          const selected = mockCampaigns.find(
            (campaign) => campaign.id === selectedCampaignId,
          );
          if (selected) {
            setSelectedCampaign(selected);
          }
        }
      }
    };

    loadCampaigns();
  }, [selectedCampaignId]);

  // Filter campaigns based on search query and filters
  useEffect(() => {
    let filtered = [...campaigns];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (campaign) =>
          campaign.name.toLowerCase().includes(query) ||
          campaign.description.toLowerCase().includes(query) ||
          campaign.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter((campaign) => campaign.type === typeFilter);
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchQuery, typeFilter]);

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    onSelectCampaign(campaign);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading campaigns...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Campaign</h3>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={typeFilter || "all"}
            onValueChange={(value) => setTypeFilter(value || null)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ai">AI SDR</SelectItem>
              <SelectItem value="human">Human SDR</SelectItem>
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
              <CardTitle>Available Campaigns</CardTitle>
              <CardDescription>
                Select a campaign for your outreach
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 p-1">
                  {filteredCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className={`flex items-start justify-between p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer ${
                        selectedCampaign?.id === campaign.id ? "bg-muted" : ""
                      }`}
                      onClick={() => handleSelectCampaign(campaign)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{campaign.name}</div>
                          <Badge
                            variant="outline"
                            className={
                              campaign.type === "ai"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            }
                          >
                            {campaign.type === "ai" ? (
                              <Bot className="h-3 w-3 mr-1" />
                            ) : (
                              <User className="h-3 w-3 mr-1" />
                            )}
                            {campaign.type === "ai" ? "AI SDR" : "Human SDR"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {campaign.description}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {campaign.tags.map((tag) => (
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
                        checked={selectedCampaign?.id === campaign.id}
                        className="ml-2 mt-1"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4" />
                {filteredCampaigns.length} campaigns available
              </div>
              <Button variant="outline" size="sm">
                Create New Campaign
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                {selectedCampaign
                  ? `Details for ${selectedCampaign.name}`
                  : "Select a campaign to see details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCampaign ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <Info className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No campaign selected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a campaign from the left to see details
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Campaign Type</span>
                      <Badge
                        variant="outline"
                        className={
                          selectedCampaign.type === "ai"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        }
                      >
                        {selectedCampaign.type === "ai" ? (
                          <Bot className="h-3 w-3 mr-1" />
                        ) : (
                          <User className="h-3 w-3 mr-1" />
                        )}
                        {selectedCampaign.type === "ai"
                          ? "AI SDR"
                          : "Human SDR"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Call Script</Label>
                    <div className="p-3 border rounded-md text-sm bg-muted/20">
                      <p className="whitespace-pre-line">
                        {selectedCampaign.script}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dispositions</Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedCampaign.dispositions.map((disposition) => (
                        <Badge
                          key={disposition}
                          variant="outline"
                          className="text-xs"
                        >
                          {disposition}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedCampaign.tags.map((tag) => (
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
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t p-4">
              <Button
                className="w-full"
                disabled={!selectedCampaign}
                onClick={() =>
                  selectedCampaign && onSelectCampaign(selectedCampaign)
                }
              >
                {selectedCampaign
                  ? `Select ${selectedCampaign.name}`
                  : "Select a Campaign"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
