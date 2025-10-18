"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Bot,
  Check,
  ChevronUp,
  ChevronDown,
  Search,
  Send,
  UserCog,
  X,
} from "lucide-react";

// Mock campaign data
const campaignData = [
  {
    id: "CAMP-001",
    name: "High Equity AI",
    type: "ai",
    leads: 124,
    engagement: 42,
    conversion: 18,
    status: "active",
    priority: "high",
    inQueue: true,
  },
  {
    id: "CAMP-002",
    name: "Pre-Foreclosure AI",
    type: "ai",
    leads: 86,
    engagement: 38,
    conversion: 15,
    status: "active",
    priority: "medium",
    inQueue: true,
  },
  {
    id: "CAMP-003",
    name: "Senior Owner AI",
    type: "ai",
    leads: 38,
    engagement: 45,
    conversion: 22,
    status: "active",
    priority: "low",
    inQueue: true,
  },
  {
    id: "CAMP-004",
    name: "High Value SDR",
    type: "sdr",
    leads: 112,
    engagement: 52,
    conversion: 28,
    status: "active",
    priority: "high",
    inQueue: true,
  },
  {
    id: "CAMP-005",
    name: "Distressed SDR",
    type: "sdr",
    leads: 83,
    engagement: 48,
    conversion: 24,
    status: "active",
    priority: "medium",
    inQueue: true,
  },
  {
    id: "CAMP-006",
    name: "Vacant Property AI",
    type: "ai",
    leads: 45,
    engagement: 32,
    conversion: 14,
    status: "paused",
    priority: "low",
    inQueue: false,
  },
  {
    id: "CAMP-007",
    name: "Absentee Owner SDR",
    type: "sdr",
    leads: 67,
    engagement: 41,
    conversion: 19,
    status: "active",
    priority: "medium",
    inQueue: false,
  },
];

interface ManageCampaignsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueType: "ai" | "sdr" | "nurture";
}

export function ManageCampaignsModal({
  open,
  onOpenChange,
  queueType,
}: ManageCampaignsModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("in-queue");

  // Get queue name based on type
  const getQueueName = () => {
    switch (queueType) {
      case "ai":
        return "AI SDR";
      case "sdr":
        return "Human SDR";
      case "nurture":
        return "Nurture";
      default:
        return "Queue";
    }
  };

  // Get icon based on queue type
  const getQueueIcon = () => {
    switch (queueType) {
      case "ai":
        return <Bot className="h-5 w-5 text-primary" />;
      case "sdr":
        return <UserCog className="h-5 w-5 text-amber-500" />;
      case "nurture":
        return <Send className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  // Filter campaigns based on queue type, tab, and search query
  const filteredCampaigns = campaignData.filter((campaign) => {
    const matchesType = campaign.type === queueType;
    const matchesQueue =
      activeTab === "in-queue" ? campaign.inQueue : !campaign.inQueue;
    const matchesSearch = campaign.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesType && matchesQueue && matchesSearch;
  });

  // Handle adding/removing campaign from queue
  const toggleCampaignInQueue = (campaignId: string) => {
    // In a real app, you would update the campaign data here
    console.log(`Toggle campaign ${campaignId} in queue`);
  };

  // Handle changing campaign priority
  const changePriority = (campaignId: string, direction: "up" | "down") => {
    // In a real app, you would update the campaign priority here
    console.log(`Change campaign ${campaignId} priority ${direction}`);
  };

  // Handle viewing campaign details
  const viewCampaign = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getQueueIcon()}
            <span>Manage {getQueueName()} Campaigns</span>
          </DialogTitle>
          <DialogDescription>
            Add, remove, and prioritize campaigns in the{" "}
            {getQueueName().toLowerCase()} queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Tabs
              defaultValue="in-queue"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-[400px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="in-queue">In Queue</TabsTrigger>
                <TabsTrigger value="available">Available</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-[300px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Status</TableHead>
                  {activeTab === "in-queue" && <TableHead>Priority</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={activeTab === "in-queue" ? 5 : 4}
                      className="h-24 text-center"
                    >
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.name}
                      </TableCell>
                      <TableCell>{campaign.leads}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            campaign.status === "active"
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      {activeTab === "in-queue" && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select defaultValue={campaign.priority}>
                              <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() =>
                                  changePriority(campaign.id, "up")
                                }
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() =>
                                  changePriority(campaign.id, "down")
                                }
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewCampaign(campaign.id)}
                          >
                            View
                          </Button>
                          {activeTab === "in-queue" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => toggleCampaignInQueue(campaign.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500"
                              onClick={() => toggleCampaignInQueue(campaign.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {activeTab === "in-queue"
              ? `${filteredCampaigns.length} campaigns in queue`
              : `${filteredCampaigns.length} campaigns available`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
