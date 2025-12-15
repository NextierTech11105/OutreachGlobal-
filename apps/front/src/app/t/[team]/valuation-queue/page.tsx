"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Building2,
  Home,
  Phone,
  Trash2,
  RotateCcw,
  Gift,
  Zap,
  AlertTriangle,
  Library,
  Search,
  FileText,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gql, useQuery } from "@apollo/client";
import { useCurrentTeam } from "@/features/team/team.context";

const CONTENT_ITEMS_QUERY = gql`
  query ContentItems($teamId: ID!, $searchQuery: String, $first: Int) {
    contentItems(teamId: $teamId, searchQuery: $searchQuery, first: $first) {
      edges {
        node {
          id
          title
          content
          description
          contentType
        }
      }
    }
  }
`;

interface QueueItem {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  propertyAddress: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  attempts: number;
  lastError?: string;
  valuationReportId?: string;
  shareableLink?: string;
  emailSentAt?: string;
  smsSentAt?: string;
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  processingCapacity: number;
}

interface PartnerOffer {
  id: string;
  businessName: string;
  category: string;
  offer: string;
  discount: string;
  expiresAt: string;
}

export default function ValuationQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoProcess, setAutoProcess] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [deliveryMethod, setDeliveryMethod] = useState<
    "sms" | "email" | "both"
  >("sms");
  const [includePartnerOffer, setIncludePartnerOffer] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [attachedContent, setAttachedContent] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [contentSearch, setContentSearch] = useState("");
  const { team } = useCurrentTeam();

  const { data: contentData } = useQuery(CONTENT_ITEMS_QUERY, {
    variables: {
      teamId: team?.id,
      searchQuery: contentSearch,
      first: 10,
    },
    skip: !team?.id,
  });

  // Sample partner offers (would come from API)
  const [partnerOffers] = useState<PartnerOffer[]>([
    {
      id: "partner-1",
      businessName: "NYC Home Inspectors",
      category: "Home Inspection",
      offer: "Free radon test with full inspection",
      discount: "$150 value",
      expiresAt: "2025-01-31",
    },
    {
      id: "partner-2",
      businessName: "Metro Moving Co",
      category: "Moving Services",
      offer: "10% off local moves",
      discount: "Up to $500 savings",
      expiresAt: "2025-02-28",
    },
    {
      id: "partner-3",
      businessName: "Liberty Title",
      category: "Title & Escrow",
      offer: "Free title search",
      discount: "$250 value",
      expiresAt: "2025-03-31",
    },
  ]);

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/valuation-queue");
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Auto-process queue
  useEffect(() => {
    if (!autoProcess || !stats || stats.pending === 0) return;

    const processInterval = setInterval(async () => {
      if (stats.processingCapacity > 0 && stats.pending > 0) {
        await processNext();
      }
    }, 3000); // Process one every 3 seconds

    return () => clearInterval(processInterval);
  }, [autoProcess, stats]);

  // Process next item
  const processNext = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/valuation-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "processNext",
          deliveryMethod,
          includePartnerOffer,
          partnerId: selectedPartner,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchQueue();
      }
    } catch (err) {
      console.error("Failed to process:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry failed item
  const retryItem = async (id: string) => {
    try {
      await fetch("/api/valuation-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id }),
      });
      await fetchQueue();
    } catch (err) {
      console.error("Failed to retry:", err);
    }
  };

  // Delete item
  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/valuation-queue?id=${id}`, { method: "DELETE" });
      await fetchQueue();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Clear completed
  const clearCompleted = async () => {
    try {
      await fetch("/api/valuation-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearCompleted" }),
      });
      await fetchQueue();
    } catch (err) {
      console.error("Failed to clear:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-500" />
            Valuation Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated property valuation delivery to leads via SMS/Email
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoProcess}
              onCheckedChange={setAutoProcess}
              id="auto-process"
            />
            <Label htmlFor="auto-process" className="text-sm">
              Auto-process
            </Label>
          </div>
          <Button
            onClick={processNext}
            disabled={isProcessing || !stats || stats.pending === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Process Next
          </Button>
          <Button variant="outline" onClick={fetchQueue}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">
                Total in Queue
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-500">
                {stats.pending}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-500">
                {stats.processing}
              </div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">
                {stats.completed}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-500">
                {stats.failed}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Queue Items</CardTitle>
                {stats && stats.completed > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCompleted}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear Completed
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({stats?.pending || 0})
                  </TabsTrigger>
                  <TabsTrigger value="processing">
                    Processing ({stats?.processing || 0})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({stats?.completed || 0})
                  </TabsTrigger>
                  <TabsTrigger value="failed">
                    Failed ({stats?.failed || 0})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No items in this category</p>
                      </div>
                    ) : (
                      filteredItems.map((item) => (
                        <Card key={item.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(item.status)}
                                  <span className="font-medium">
                                    {item.leadName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Home className="h-3 w-3" />
                                    {item.propertyAddress}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {item.leadPhone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {item.leadPhone}
                                    </span>
                                  )}
                                  {item.leadEmail && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {item.leadEmail}
                                    </span>
                                  )}
                                </div>
                                {item.shareableLink && (
                                  <div className="text-xs text-green-500">
                                    Report: {item.shareableLink}
                                  </div>
                                )}
                                {item.lastError && (
                                  <div className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {item.lastError}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {item.status === "failed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => retryItem(item.id)}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>
                How valuation reports are sent to leads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Delivery Method</Label>
                <Select
                  value={deliveryMethod}
                  onValueChange={(v) =>
                    setDeliveryMethod(v as "sms" | "email" | "both")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS Only
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Only
                      </div>
                    </SelectItem>
                    <SelectItem value="both">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Both SMS & Email
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  SMS Message Preview
                </Label>
                <p className="text-sm mt-1">
                  Hi {"{name}"}, here&apos;s your free property valuation for{" "}
                  {"{address}"}: {"{link}"}
                  {includePartnerOffer && " + Special offer inside!"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Partner Offers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                Partner Offers
              </CardTitle>
              <CardDescription>
                Include local business coupons with valuations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-partner">Include partner offer</Label>
                <Switch
                  id="include-partner"
                  checked={includePartnerOffer}
                  onCheckedChange={setIncludePartnerOffer}
                />
              </div>

              {includePartnerOffer && (
                <div className="space-y-3">
                  <Label>Select Partner</Label>
                  {partnerOffers.map((partner) => (
                    <Card
                      key={partner.id}
                      className={`cursor-pointer transition-colors ${
                        selectedPartner === partner.id
                          ? "border-purple-500 bg-purple-500/10"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedPartner(partner.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {partner.businessName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {partner.category}
                            </div>
                            <div className="text-xs text-purple-500 mt-1">
                              {partner.offer}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {partner.discount}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outline" className="w-full" size="sm">
                    <Building2 className="h-4 w-4 mr-2" />
                    Find Partner Businesses
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Library Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5 text-blue-500" />
                Content Library
              </CardTitle>
              <CardDescription>
                Attach templates or resources to the message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attachedContent ? (
                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">
                      {attachedContent.title}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachedContent(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsContentDialogOpen(true)}
                >
                  <Library className="h-4 w-4 mr-2" />
                  Attach Content
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Add to Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Add to Queue</CardTitle>
              <CardDescription>
                Manually add a valuation request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);

                  await fetch("/api/valuation-queue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "add",
                      leadName: formData.get("leadName"),
                      leadPhone: formData.get("leadPhone"),
                      leadEmail: formData.get("leadEmail"),
                      propertyAddress: formData.get("propertyAddress"),
                    }),
                  });

                  form.reset();
                  await fetchQueue();
                }}
              >
                <Input name="leadName" placeholder="Lead Name" required />
                <Input name="leadPhone" placeholder="Phone" type="tel" />
                <Input
                  name="leadEmail"
                  placeholder="Email"
                  type="email"
                  required
                />
                <Input
                  name="propertyAddress"
                  placeholder="Property Address"
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Add to Queue
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Content</DialogTitle>
            <DialogDescription>
              Choose a template or resource to attach to the valuation message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                className="pl-8"
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {contentData?.contentItems?.edges.map(({ node }: any) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setAttachedContent({ id: node.id, title: node.title });
                      setIsContentDialogOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{node.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {node.description || "No description"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {node.contentType}
                    </Badge>
                  </div>
                ))}
                {(!contentData?.contentItems?.edges ||
                  contentData.contentItems.edges.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No content found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
