"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { sf } from "@/lib/utils/safe-format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Plus,
  MoreHorizontal,
  Zap,
  Users,
  Database,
  Play,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  Home,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { Bucket, BucketSource, EnrichmentStatus } from "@/lib/types/bucket";

interface SavedBucketsProps {
  onSelectBucket?: (bucket: Bucket) => void;
  onViewLeads?: (bucket: Bucket) => void;
}

// Status badge styling
const statusStyles: Record<
  EnrichmentStatus,
  { icon: React.ElementType; className: string; label: string }
> = {
  pending: {
    icon: Clock,
    className: "bg-zinc-600 text-zinc-200",
    label: "Pending",
  },
  queued: { icon: Clock, className: "bg-blue-600 text-white", label: "Queued" },
  processing: {
    icon: Loader2,
    className: "bg-yellow-600 text-white",
    label: "Processing",
  },
  completed: {
    icon: CheckCircle,
    className: "bg-green-600 text-white",
    label: "Completed",
  },
  failed: {
    icon: AlertCircle,
    className: "bg-red-600 text-white",
    label: "Failed",
  },
  partial: {
    icon: AlertCircle,
    className: "bg-orange-600 text-white",
    label: "Partial",
  },
};

// Source badge styling
const sourceStyles: Record<
  BucketSource,
  { icon: React.ElementType; className: string; label: string }
> = {
  "real-estate": {
    icon: Home,
    className: "bg-emerald-600 text-white",
    label: "Real Estate",
  },
  apollo: {
    icon: Building2,
    className: "bg-purple-600 text-white",
    label: "Apollo",
  },
  mixed: {
    icon: Database,
    className: "bg-cyan-600 text-white",
    label: "Mixed",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export function SavedBuckets({
  onSelectBucket,
  onViewLeads,
}: SavedBucketsProps) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<BucketSource | "all">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch buckets
  const fetchBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") {
        params.set("source", sourceFilter);
      }

      const response = await fetch(`/api/buckets?${params}`);
      if (!response.ok) throw new Error("Failed to fetch buckets");

      const data = await response.json();
      setBuckets(data.buckets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load buckets");
    } finally {
      setLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  // Filter buckets by search
  const filteredBuckets = buckets.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Actions
  const handleEnrich = async (bucket: Bucket) => {
    setActionLoading(bucket.id);
    try {
      const response = await fetch(`/api/buckets/${bucket.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: "normal" }),
      });
      if (!response.ok) throw new Error("Failed to queue enrichment");
      await fetchBuckets();
    } catch (err) {
      console.error("Enrich error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleQueue = async (bucket: Bucket) => {
    setActionLoading(bucket.id);
    try {
      const response = await fetch(`/api/buckets/${bucket.id}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Failed to queue leads");
      await fetchBuckets();
    } catch (err) {
      console.error("Queue error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCampaign = async (bucket: Bucket) => {
    setActionLoading(bucket.id);
    try {
      const response = await fetch(`/api/buckets/${bucket.id}/campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Campaign: ${bucket.name}` }),
      });
      if (!response.ok) throw new Error("Failed to create campaign");
      await fetchBuckets();
    } catch (err) {
      console.error("Campaign error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (bucket: Bucket) => {
    setActionLoading(bucket.id);
    try {
      // Fetch leads first
      const response = await fetch(
        `/api/buckets/${bucket.id}/leads?perPage=1000`,
      );
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();

      // Export to CSV
      const exportResponse = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: data.leads.map((l: Record<string, unknown>) => {
            const apolloData = l.apolloData as
              | Record<string, unknown>
              | undefined;
            const propertyData = l.propertyData as
              | Record<string, unknown>
              | undefined;
            const tags = (l.tags as string[] | undefined) || [];
            const autoTags = (l.autoTags as string[] | undefined) || [];
            return {
              firstName: l.firstName,
              lastName: l.lastName,
              email: l.email,
              phone: l.phone,
              company: apolloData?.company || "",
              address: propertyData?.address || "",
              city: propertyData?.city || apolloData?.city || "",
              state: propertyData?.state || "",
              status: l.status,
              tags: [...tags, ...autoTags].join("; "),
            };
          }),
          filename: `${bucket.name.replace(/\s+/g, "-").toLowerCase()}.csv`,
        }),
      });

      const exportData = await exportResponse.json();

      if (exportData.url) {
        window.open(exportData.url, "_blank");
      } else if (exportData.base64) {
        // Fallback: download via blob
        const binary = atob(exportData.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportData.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const totalLeads = buckets.reduce((sum, b) => sum + b.totalLeads, 0);
  const enrichedLeads = buckets.reduce((sum, b) => sum + b.enrichedLeads, 0);
  const processingBuckets = buckets.filter(
    (b) => b.enrichmentStatus === "processing",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Saved Buckets</h2>
          <p className="text-zinc-400">
            Manage your lead buckets and campaigns
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              New Bucket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bucket</DialogTitle>
            </DialogHeader>
            <p className="text-zinc-400">
              Use MCP Command Center to search and create buckets.
            </p>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Database className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {buckets.length}
                </p>
                <p className="text-xs text-zinc-500">Total Buckets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {sf(totalLeads)}
                </p>
                <p className="text-xs text-zinc-500">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Zap className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {sf(enrichedLeads)}
                </p>
                <p className="text-xs text-zinc-500">Enriched</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600/20 rounded-lg">
                <RefreshCw className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {processingBuckets}
                </p>
                <p className="text-xs text-zinc-500">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search buckets by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              {(["all", "real-estate", "apollo", "mixed"] as const).map(
                (source) => (
                  <Button
                    key={source}
                    size="sm"
                    variant={sourceFilter === source ? "default" : "outline"}
                    onClick={() => setSourceFilter(source)}
                    className={
                      sourceFilter === source
                        ? "bg-purple-600"
                        : "border-zinc-700 text-zinc-400 hover:text-white"
                    }
                  >
                    {source === "all" ? "All" : sourceStyles[source].label}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchBuckets}
              className="border-zinc-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Buckets Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">All Buckets</CardTitle>
          <CardDescription>
            {filteredBuckets.length} buckets found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8 text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Source</TableHead>
                  <TableHead className="text-zinc-400">Leads</TableHead>
                  <TableHead className="text-zinc-400">Enrichment</TableHead>
                  <TableHead className="text-zinc-400">Tags</TableHead>
                  <TableHead className="text-zinc-400">Updated</TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuckets.map((bucket) => {
                  const SourceIcon = sourceStyles[bucket.source].icon;
                  const StatusIcon = statusStyles[bucket.enrichmentStatus].icon;
                  const enrichmentPercent = bucket.totalLeads
                    ? Math.round(
                        (bucket.enrichedLeads / bucket.totalLeads) * 100,
                      )
                    : 0;

                  return (
                    <TableRow
                      key={bucket.id}
                      className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                      onClick={() => onSelectBucket?.(bucket)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">
                            {bucket.name}
                          </p>
                          {bucket.description && (
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                              {bucket.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={sourceStyles[bucket.source].className}
                        >
                          <SourceIcon className="h-3 w-3 mr-1" />
                          {sourceStyles[bucket.source].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-white font-medium">
                            {bucket.totalLeads}
                          </span>
                          <span className="text-zinc-500 ml-1">total</span>
                          <div className="text-xs text-zinc-500">
                            {bucket.contactedLeads} contacted
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                statusStyles[bucket.enrichmentStatus].className
                              }
                            >
                              <StatusIcon
                                className={`h-3 w-3 mr-1 ${
                                  bucket.enrichmentStatus === "processing"
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                              {statusStyles[bucket.enrichmentStatus].label}
                            </Badge>
                          </div>
                          {bucket.enrichmentStatus === "processing" &&
                            bucket.enrichmentProgress && (
                              <Progress
                                value={enrichmentPercent}
                                className="h-1"
                              />
                            )}
                          <p className="text-xs text-zinc-500">
                            {bucket.enrichedLeads}/{bucket.totalLeads} enriched
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {bucket.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="border-zinc-700 text-zinc-400 text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {bucket.tags.length > 3 && (
                            <Badge
                              variant="outline"
                              className="border-zinc-700 text-zinc-500 text-xs"
                            >
                              +{bucket.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDate(bucket.updatedAt)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              {actionLoading === bucket.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-zinc-900 border-zinc-800"
                          >
                            <DropdownMenuItem
                              onClick={() => onViewLeads?.(bucket)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Leads
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEnrich(bucket)}
                              disabled={
                                bucket.enrichmentStatus === "processing"
                              }
                              className="cursor-pointer"
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Enrich All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleQueue(bucket)}
                              className="cursor-pointer"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Queue for Outreach
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCreateCampaign(bucket)}
                              className="cursor-pointer"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Create Campaign
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={() => handleExport(bucket)}
                              className="cursor-pointer"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="cursor-pointer text-red-400">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Bucket
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
