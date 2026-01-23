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
  Copy,
  ExternalLink,
  Share2,
  FolderOpen,
  File,
  Link2,
  Eye,
  Download,
  Plus,
  Sparkles,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

// Queue item type
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

// Saved report type
interface SavedReport {
  id: string;
  name: string;
  type: "property-valuation" | "business-evaluation" | "ai-blueprint" | "generic";
  path: string;
  publicUrl: string;
  createdAt: string;
  size?: number;
  metadata?: {
    address?: string;
    companyName?: string;
    estimatedValue?: number;
  };
}

export default function ContentDeliveryHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "create";

  const [activeTab, setActiveTab] = useState(initialTab);

  // Queue state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoProcess, setAutoProcess] = useState(false);
  const [queueTab, setQueueTab] = useState("pending");
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "email" | "both">("sms");

  // Saved reports state
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(true);
  const [reportsSearch, setReportsSearch] = useState("");

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/valuation-queue");
      const data = await res.json();
      if (data.success) {
        setQueueItems(data.items || []);
        setQueueStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  // Fetch saved reports
  const fetchSavedReports = useCallback(async () => {
    setIsReportsLoading(true);
    try {
      const res = await fetch("/api/research-library?listAll=true");
      const data = await res.json();
      if (data.success && data.reports) {
        setSavedReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to fetch saved reports:", err);
    } finally {
      setIsReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchSavedReports();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchSavedReports]);

  // Auto-process queue
  useEffect(() => {
    if (!autoProcess || !queueStats || queueStats.pending === 0) return;
    const processInterval = setInterval(async () => {
      if (queueStats.processingCapacity > 0 && queueStats.pending > 0) {
        await processNext();
      }
    }, 3000);
    return () => clearInterval(processInterval);
  }, [autoProcess, queueStats]);

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

  // Copy link to clipboard
  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  // Share via SMS
  const shareViaSms = async (report: SavedReport) => {
    toast.info("Opening SMS share dialog...");
    // TODO: Implement SMS share modal
  };

  // Share via Email
  const shareViaEmail = async (report: SavedReport) => {
    const subject = encodeURIComponent(`Your ${report.type === "property-valuation" ? "Property Valuation" : "Report"}: ${report.name}`);
    const body = encodeURIComponent(`View your report here: ${report.publicUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Share via WhatsApp
  const shareViaWhatsApp = async (report: SavedReport) => {
    const text = encodeURIComponent(`Check out this ${report.type === "property-valuation" ? "property valuation" : "report"}: ${report.publicUrl}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter queue items
  const filteredQueueItems = queueItems.filter((item) => {
    if (queueTab === "all") return true;
    return item.status === queueTab;
  });

  // Filter saved reports
  const filteredReports = savedReports.filter((report) =>
    report.name.toLowerCase().includes(reportsSearch.toLowerCase()) ||
    report.metadata?.address?.toLowerCase().includes(reportsSearch.toLowerCase()) ||
    report.metadata?.companyName?.toLowerCase().includes(reportsSearch.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Library className="h-8 w-8 text-purple-600" />
            Content Delivery Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, queue, and share valuations and reports with one-click shareable links
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchSavedReports()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Queue
            {queueStats && queueStats.pending > 0 && (
              <Badge className="ml-1 bg-blue-600">{queueStats.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Saved
            {savedReports.length > 0 && (
              <Badge variant="secondary" className="ml-1">{savedReports.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* CREATE TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="create" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Property Valuation */}
            <Card className="hover:border-green-500 cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => router.push(`/t/${window.location.pathname.split("/")[2]}/valuation`)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Home className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Property Valuation</CardTitle>
                    <CardDescription>Real Estate API + OpenAI</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate comprehensive property valuations with comparables, neighborhood data, and AI analysis.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-green-600">Real Estate API</Badge>
                  <Badge variant="outline" className="text-blue-600">OpenAI Analysis</Badge>
                  <Badge variant="outline" className="text-purple-600">Skip Trace</Badge>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Valuation
                </Button>
              </CardContent>
            </Card>

            {/* Business Evaluation */}
            <Card className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => toast.info("Business Evaluation coming soon!")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Business Evaluation</CardTitle>
                    <CardDescription>Apollo + Perplexity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate business valuations with company data, industry analysis, and competitive intel.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-purple-600">Apollo.io</Badge>
                  <Badge variant="outline" className="text-orange-600">Perplexity</Badge>
                  <Badge variant="outline" className="text-green-600">Firmographics</Badge>
                </div>
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Evaluation
                </Button>
              </CardContent>
            </Card>

            {/* AI Blueprint */}
            <Card className="hover:border-purple-500 cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => toast.info("AI Blueprint coming soon!")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>AI Blueprint</CardTitle>
                    <CardDescription>Custom AI Content</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate custom AI-powered content, proposals, and reports for any use case.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-blue-600">GPT-4</Badge>
                  <Badge variant="outline" className="text-green-600">Claude</Badge>
                  <Badge variant="outline" className="text-purple-600">Custom Templates</Badge>
                </div>
                <Button className="w-full" variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Blueprint
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{savedReports.filter(r => r.type === "property-valuation").length}</div>
                  <div className="text-sm text-muted-foreground">Property Valuations</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{savedReports.filter(r => r.type === "business-evaluation").length}</div>
                  <div className="text-sm text-muted-foreground">Business Evaluations</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold text-purple-600">{queueStats?.completed || 0}</div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold text-amber-600">{queueStats?.pending || 0}</div>
                  <div className="text-sm text-muted-foreground">In Queue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* QUEUE TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="queue" className="space-y-4">
          {/* Queue Controls */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Delivery Queue</CardTitle>
                  <CardDescription>Auto-send valuations via SMS/Email - 2K/day SignalHouse approved</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={autoProcess} onCheckedChange={setAutoProcess} id="auto-process" />
                    <Label htmlFor="auto-process" className="text-sm">Auto-process</Label>
                  </div>
                  <Select value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as "sms" | "email" | "both")}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS Only</SelectItem>
                      <SelectItem value="email">Email Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={processNext} disabled={isProcessing || !queueStats || queueStats.pending === 0} className="bg-blue-600 hover:bg-blue-700">
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Process Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stats */}
              {queueStats && (
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">{queueStats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-600">{queueStats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{queueStats.processing}</div>
                    <div className="text-xs text-muted-foreground">Processing</div>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              )}

              {/* Queue Filter Tabs */}
              <Tabs value={queueTab} onValueChange={setQueueTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="processing">Processing</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Queue Items */}
              <ScrollArea className="h-[400px] mt-4">
                {isQueueLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredQueueItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items in queue</p>
                    <p className="text-sm">Create a valuation and it will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredQueueItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={item.status} />
                          <div>
                            <p className="font-medium">{item.leadName}</p>
                            <p className="text-xs text-muted-foreground">{item.propertyAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.shareableLink && (
                            <Button variant="ghost" size="sm" onClick={() => copyLink(item.shareableLink!)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {item.status === "failed" && (
                            <Button variant="ghost" size="sm" className="text-amber-600">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* SAVED TAB - THE KEY FEATURE */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-purple-600" />
                    Saved Reports
                  </CardTitle>
                  <CardDescription>
                    All your saved valuations and reports with public shareable links
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={reportsSearch}
                      onChange={(e) => setReportsSearch(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" onClick={() => fetchSavedReports()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* File Path Info */}
              <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Storage Location: </span>
                <code className="text-purple-600">DO Spaces → nextier/leads/{"{leadId}"}/valuation-reports/</code>
              </div>

              <ScrollArea className="h-[500px]">
                {isReportsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved reports yet</p>
                    <p className="text-sm">Create a valuation and save it to see it here</p>
                    <Button className="mt-4" onClick={() => setActiveTab("create")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Report
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map((report) => (
                      <Card key={report.id} className="hover:border-purple-500 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                report.type === "property-valuation" ? "bg-green-100 dark:bg-green-900/30" :
                                report.type === "business-evaluation" ? "bg-blue-100 dark:bg-blue-900/30" :
                                "bg-purple-100 dark:bg-purple-900/30"
                              }`}>
                                {report.type === "property-valuation" ? (
                                  <Home className="h-5 w-5 text-green-600" />
                                ) : report.type === "business-evaluation" ? (
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <FileText className="h-5 w-5 text-purple-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold">{report.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {report.metadata?.address || report.metadata?.companyName || report.path}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {report.type.replace("-", " ")}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(report.createdAt).toLocaleDateString()}
                                  </span>
                                  {report.size && (
                                    <span className="text-xs text-muted-foreground">
                                      {(report.size / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyLink(report.publicUrl)}
                                title="Copy Link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(report.publicUrl, "_blank")}
                                title="View Report"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => shareViaSms(report)}
                                title="Share via SMS"
                                className="text-green-600"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => shareViaEmail(report)}
                                title="Share via Email"
                                className="text-blue-600"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => shareViaWhatsApp(report)}
                                title="Share via WhatsApp"
                                className="text-emerald-600"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Public URL Display */}
                          <div className="mt-3 p-2 bg-muted rounded flex items-center justify-between">
                            <code className="text-xs text-purple-600 truncate flex-1 mr-2">
                              {report.publicUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(report.publicUrl)}
                              className="shrink-0"
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* TEMPLATES TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>SMS and Email templates for content delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* SMS Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      SMS Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">Property Valuation</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        "Hi {"{name}"}, your property valuation for {"{address}"} is ready! View here: {"{link}"}"
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">Business Evaluation</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        "Hi {"{name}"}, your business evaluation for {"{company}"} is complete. View: {"{link}"}"
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => toast.info("Template editor coming soon!")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </CardContent>
                </Card>

                {/* Email Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      Email Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">Property Valuation Email</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Professional HTML email with valuation summary and CTA button
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">Business Evaluation Email</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Detailed business analysis email with company insights
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => toast.info("Template editor coming soon!")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
