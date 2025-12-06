"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder, FolderPlus, FileText, ChevronRight, Home, Search,
  MoreVertical, Trash2, Download, Share2, Eye, RefreshCw,
  Building2, DollarSign, MapPin, Calendar, ArrowLeft, Plus,
  FolderOpen, Clock, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

interface FolderItem {
  id: string;
  name: string;
  type: "folder" | "report";
  path: string;
  createdAt: string;
  updatedAt?: string;
  size?: number;
  metadata?: {
    address?: string;
    propertyType?: string;
    estimatedValue?: number;
    city?: string;
    state?: string;
  };
}

interface SavedReport {
  id: string;
  name: string;
  savedAt: string;
  path: string;
  report: {
    property: Record<string, unknown>;
    valuation: Record<string, unknown>;
    comparables: Array<Record<string, unknown>>;
    neighborhood: Record<string, unknown>;
  };
}

export default function ResearchLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("report");

  const [currentPath, setCurrentPath] = useState("/");
  const [items, setItems] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [viewReportOpen, setViewReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Load items for current path
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/research-library?path=${encodeURIComponent(currentPath)}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setBreadcrumbs(data.breadcrumbs || []);
      }
    } catch (err) {
      console.error("Failed to load items:", err);
      toast.error("Failed to load folder contents");
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Load specific report if ID in URL
  useEffect(() => {
    if (reportId) {
      loadReport(reportId);
    }
  }, [reportId]);

  const loadReport = async (id: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/research-library?reportId=${id}`);
      const data = await res.json();
      if (data.success && data.report) {
        setSelectedReport(data.report);
        setViewReportOpen(true);
      } else {
        toast.error("Report not found");
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      toast.error("Failed to load report");
    } finally {
      setReportLoading(false);
    }
  };

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? "/" : "/" + parts.join("/"));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name required");
      return;
    }

    try {
      const res = await fetch("/api/research-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createFolder",
          path: currentPath,
          name: newFolderName.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Folder "${newFolderName}" created!`);
        setCreateFolderOpen(false);
        setNewFolderName("");
        loadItems();
      } else {
        toast.error(data.error || "Failed to create folder");
      }
    } catch (err) {
      console.error("Create folder error:", err);
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteItem = async (item: FolderItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;

    try {
      const res = await fetch(`/api/research-library?path=${encodeURIComponent(item.path)}&id=${item.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`"${item.name}" deleted`);
        loadItems();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Delete failed");
    }
  };

  const handleViewReport = async (item: FolderItem) => {
    await loadReport(item.id);
  };

  const handleShareReport = (item: FolderItem) => {
    const url = `${window.location.origin}/t/team/research-library?report=${item.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Shareable link copied to clipboard!");
  };

  const handleOpenInValuation = (report: SavedReport) => {
    // Store report data and navigate to valuation page
    sessionStorage.setItem("loadedReport", JSON.stringify(report.report));
    router.push("/t/team/valuation?loadReport=true");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Filter items by search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.metadata?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.metadata?.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate folders and reports
  const folders = filteredItems.filter(i => i.type === "folder");
  const reports = filteredItems.filter(i => i.type === "report");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            Research Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize and access your saved property valuations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateFolderOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Breadcrumbs & Search */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPath("/")}
                className="h-8 px-2"
              >
                <Home className="h-4 w-4" />
              </Button>
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPath("/" + breadcrumbs.slice(0, idx + 1).join("/"))}
                    className="h-8 px-2"
                  >
                    {crumb}
                  </Button>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 md:max-w-xs ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search folders & reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back button when not at root */}
      {currentPath !== "/" && (
        <Button variant="ghost" onClick={navigateUp} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      {/* Content */}
      <div className="grid gap-4">
        {/* Folders */}
        {folders.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Folders ({folders.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {folders.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                  onClick={() => navigateToFolder(folder.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Folder className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-blue-600 transition-colors">
                            {folder.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(folder.createdAt)}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteItem(folder); }}>
                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                            Delete Folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Reports */}
        {reports.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Saved Reports ({reports.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:border-green-500 hover:shadow-md transition-all group"
                  onClick={() => handleViewReport(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <FileText className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium group-hover:text-green-600 transition-colors truncate">
                            {report.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(report.createdAt)}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewReport(report); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShareReport(report); }}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Copy Share Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteItem(report); }}>
                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Report metadata */}
                    {report.metadata && (
                      <div className="space-y-2 border-t pt-3 mt-3">
                        {report.metadata.address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{report.metadata.address}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {report.metadata.propertyType && (
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {report.metadata.propertyType}
                            </Badge>
                          )}
                          {report.metadata.estimatedValue && (
                            <Badge className="bg-green-600 text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />
                              {formatCurrency(report.metadata.estimatedValue)}
                            </Badge>
                          )}
                        </div>
                        {report.metadata.city && report.metadata.state && (
                          <p className="text-xs text-muted-foreground">
                            {report.metadata.city}, {report.metadata.state}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && folders.length === 0 && reports.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">This folder is empty</h3>
              <p className="text-muted-foreground mb-4">
                Create a folder or save a valuation report here
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
                <Button onClick={() => router.push("/t/team/valuation")} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Valuation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Create New Folder
            </DialogTitle>
            <DialogDescription>
              Create a folder to organize your property research
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Creating in: {currentPath === "/" ? "Root" : currentPath}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} className="bg-blue-600 hover:bg-blue-700">
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={viewReportOpen} onOpenChange={setViewReportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              {selectedReport?.name || "Valuation Report"}
            </DialogTitle>
            <DialogDescription>
              Saved {selectedReport?.savedAt ? formatDate(selectedReport.savedAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {reportLoading ? (
            <div className="py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading report...</p>
            </div>
          ) : selectedReport?.report ? (
            <div className="py-4 space-y-6">
              {/* Property Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Property Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {(selectedReport.report.property as Record<string, unknown>)?.address?.address ||
                          (selectedReport.report.property as Record<string, unknown>)?.address?.street || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">
                        {(selectedReport.report.property as Record<string, unknown>)?.propertyType || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Value</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(
                          Number((selectedReport.report.property as Record<string, unknown>)?.estimatedValue) ||
                          Number((selectedReport.report.valuation as Record<string, unknown>)?.estimatedValue) || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Comparables</p>
                      <p className="font-medium">
                        {selectedReport.report.comparables?.length || 0} found
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Valuation Details */}
              {selectedReport.report.valuation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Valuation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Price/SqFt</p>
                        <p className="font-medium">
                          ${(selectedReport.report.valuation as Record<string, unknown>)?.pricePerSqft || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Comparable Avg</p>
                        <p className="font-medium">
                          {formatCurrency(Number((selectedReport.report.valuation as Record<string, unknown>)?.comparableAvg) || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Equity Estimate</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(Number((selectedReport.report.valuation as Record<string, unknown>)?.equityEstimate) || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <Badge variant={(selectedReport.report.valuation as Record<string, unknown>)?.confidence === "high" ? "default" : "outline"}>
                          {(selectedReport.report.valuation as Record<string, unknown>)?.confidence || "N/A"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No report data available</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReportOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedReport) {
                  const url = `${window.location.origin}/t/team/research-library?report=${selectedReport.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Share link copied!");
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            {selectedReport && (
              <Button
                onClick={() => handleOpenInValuation(selectedReport)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Valuation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
