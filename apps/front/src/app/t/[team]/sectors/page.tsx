"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  DollarSign,
  MapPin,
  Briefcase,
  Search,
  Database,
  Upload,
  TrendingUp,
  Users,
  FileSpreadsheet,
  RefreshCcw,
  Plus,
  ArrowRight,
  BarChart3,
  Layers,
  HardDrive,
  Eye,
  Send,
  Loader2,
  X,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Ban,
  Clock,
  Zap,
  Filter,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import {
  SECTOR_WORKSPACES,
  Sector,
  SectorWorkspace,
  getAllSectors,
  getSectorById,
  getSectorsByCategory,
} from "@/config/sectors";
import {
  SectorWorkspaceSelector,
  SectorBadges,
} from "@/components/sector-workspace-selector";
import {
  PIPELINE_STATUS_CONFIG,
  type PipelineStatus,
} from "@/lib/types/bucket";

// Stats for each sector (would come from API in production)
interface SectorStats {
  sectorId: string;
  totalRecords: number;
  enrichedRecords: number;
  contactedRecords: number;
  lastUpdated?: Date;
}

// Data source summary
interface DataSourceSummary {
  id: string;
  name: string;
  sourceType: string;
  sourceProvider: string;
  totalRows: number;
  status: "pending" | "processing" | "completed" | "failed";
  sectorId?: string;
  createdAt: Date;
}

// Real bucket/data lake from DO Spaces
interface DataLake {
  id: string;
  name: string;
  description?: string;
  source: string;
  totalLeads: number;
  enrichedLeads: number;
  contactedLeads: number;
  queuedLeads: number;
  contactableLeads?: number; // Records with mobile phone
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  filters?: Record<string, unknown>;
}

// Target for contactable leads before SMS campaign
const CONTACTABLE_TARGET = 2000;

// Pipeline stats aggregation
interface PipelineStats {
  raw: number;
  skip_traced: number;
  validated: number;
  ready: number;
  blocked: number;
  sent: number;
  // Blocked breakdown
  blockedDNC: number;
  blockedLitigator: number;
  blockedInvalid: number;
  // Quality counts
  withPhone: number;
  withMobile: number;
  withEmail: number;
}

export default function SectorsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.team as string;
  const [activeWorkspace, setActiveWorkspace] = useState<string>("data_lakes");
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedDataLake, setSelectedDataLake] = useState<DataLake | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorStats, setSectorStats] = useState<Record<string, SectorStats>>(
    {},
  );
  const [dataSources, setDataSources] = useState<DataSourceSummary[]>([]);
  const [dataLakes, setDataLakes] = useState<DataLake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    raw: 0,
    skip_traced: 0,
    validated: 0,
    ready: 0,
    blocked: 0,
    sent: 0,
    blockedDNC: 0,
    blockedLitigator: 0,
    blockedInvalid: 0,
    withPhone: 0,
    withMobile: 0,
    withEmail: 0,
  });

  // CSV Upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      total: number;
      withPhone: number;
      withEmail: number;
      withAddress: number;
    };
  } | null>(null);

  // Fetch REAL data from buckets API (DO Spaces data lakes)
  useEffect(() => {
    async function fetchRealData() {
      setIsLoading(true);
      try {
        // Fetch real buckets from DO Spaces
        const [bucketsResponse, sectorStatsResponse] = await Promise.all([
          fetch("/api/buckets?perPage=100"),
          fetch("/api/sectors/stats"),
        ]);
        const data = await bucketsResponse.json();
        const sectorData = await sectorStatsResponse.json();

        // Convert buckets to sector stats + merge B2B sector stats
        const stats: Record<string, SectorStats> = {};
        const sources: DataSourceSummary[] = [];

        // Add B2B sector stats from SIC code aggregation
        if (sectorData.sectors) {
          Object.entries(sectorData.sectors).forEach(
            ([sectorId, sectorStat]: [string, unknown]) => {
              const s = sectorStat as {
                totalRecords: number;
                enriched: number;
              };
              stats[sectorId] = {
                sectorId,
                totalRecords: s.totalRecords || 0,
                enrichedRecords: s.enriched || 0,
                contactedRecords: 0,
                lastUpdated: new Date(),
              };
            },
          );
        }

        if (data.buckets && data.buckets.length > 0) {
          // Pipeline aggregation
          const pipeline: PipelineStats = {
            raw: 0,
            skip_traced: 0,
            validated: 0,
            ready: 0,
            blocked: 0,
            sent: 0,
            blockedDNC: 0,
            blockedLitigator: 0,
            blockedInvalid: 0,
            withPhone: 0,
            withMobile: 0,
            withEmail: 0,
          };

          data.buckets.forEach(
            (bucket: {
              id: string;
              name: string;
              source: string;
              totalLeads: number;
              enrichedLeads: number;
              contactedLeads: number;
              queuedLeads: number;
              createdAt: string;
              tags?: string[];
              // Pipeline counts (if available from API)
              pipelineCounts?: {
                raw?: number;
                skip_traced?: number;
                validated?: number;
                ready?: number;
                blocked?: number;
                sent?: number;
              };
              blockedCounts?: {
                dnc?: number;
                litigator?: number;
                invalid?: number;
              };
              qualityCounts?: {
                withPhone?: number;
                withMobile?: number;
                withEmail?: number;
              };
            }) => {
              // Create stat entry for each bucket (as its own data lake)
              stats[bucket.id] = {
                sectorId: bucket.id,
                totalRecords: bucket.totalLeads || 0,
                enrichedRecords: bucket.enrichedLeads || 0,
                contactedRecords: bucket.contactedLeads || 0,
                lastUpdated: new Date(bucket.createdAt),
              };

              // Aggregate pipeline counts
              if (bucket.pipelineCounts) {
                pipeline.raw += bucket.pipelineCounts.raw || 0;
                pipeline.skip_traced += bucket.pipelineCounts.skip_traced || 0;
                pipeline.validated += bucket.pipelineCounts.validated || 0;
                pipeline.ready += bucket.pipelineCounts.ready || 0;
                pipeline.blocked += bucket.pipelineCounts.blocked || 0;
                pipeline.sent += bucket.pipelineCounts.sent || 0;
              } else {
                // Estimate from enriched/contacted counts
                const unenriched = Math.max(0, bucket.totalLeads - bucket.enrichedLeads);
                const enrichedNotContacted = Math.max(0, bucket.enrichedLeads - bucket.contactedLeads);
                pipeline.raw += unenriched;
                pipeline.skip_traced += Math.floor(enrichedNotContacted * 0.6); // Estimate
                pipeline.validated += Math.floor(enrichedNotContacted * 0.4); // Estimate
                pipeline.ready += Math.floor(bucket.queuedLeads || 0);
                pipeline.sent += bucket.contactedLeads || 0;
              }

              // Aggregate blocked counts
              if (bucket.blockedCounts) {
                pipeline.blockedDNC += bucket.blockedCounts.dnc || 0;
                pipeline.blockedLitigator += bucket.blockedCounts.litigator || 0;
                pipeline.blockedInvalid += bucket.blockedCounts.invalid || 0;
              }

              // Aggregate quality counts
              if (bucket.qualityCounts) {
                pipeline.withPhone += bucket.qualityCounts.withPhone || 0;
                pipeline.withMobile += bucket.qualityCounts.withMobile || 0;
                pipeline.withEmail += bucket.qualityCounts.withEmail || 0;
              } else {
                // Estimate from enriched
                pipeline.withPhone += bucket.enrichedLeads || 0;
                pipeline.withMobile += Math.floor((bucket.enrichedLeads || 0) * 0.7);
                pipeline.withEmail += Math.floor((bucket.enrichedLeads || 0) * 0.5);
              }

              // Add as data source
              sources.push({
                id: bucket.id,
                name: bucket.name,
                sourceType: bucket.source === "real-estate" ? "api" : "csv",
                sourceProvider: bucket.source || "import",
                totalRows: bucket.totalLeads || 0,
                status: "completed",
                sectorId: bucket.id,
                createdAt: new Date(bucket.createdAt),
              });
            },
          );

          setPipelineStats(pipeline);
          setDataSources(sources);
          setDataLakes(data.buckets);
        }

        setSectorStats(stats);
      } catch (error) {
        console.error("Failed to fetch buckets:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRealData();
  }, []);

  // Handle CSV upload (two-step: storage upload -> import)
  // Uses pre-signed URL for large files (>10MB) to avoid gateway timeout
  const handleUpload = async () => {
    if (!uploadFile || !uploadName) {
      toast.error("Please select a file and enter a name");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const folder = `sectors/usbizdata/${uploadName.replace(/\s+/g, "-").toLowerCase()}`;
      const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
      let storagePath: string;

      if (uploadFile.size > LARGE_FILE_THRESHOLD) {
        // Large file: Use pre-signed URL for direct upload to DO Spaces
        toast.info(`Large file (${(uploadFile.size / 1024 / 1024).toFixed(1)}MB) - uploading directly...`);

        // Step 1a: Get pre-signed URL
        const presignRes = await fetch("/api/storage/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: uploadFile.name,
            folder,
            contentType: uploadFile.type || "text/csv",
            size: uploadFile.size,
          }),
        });

        if (!presignRes.ok) {
          throw new Error(`Failed to get upload URL: ${presignRes.status}`);
        }

        const presignData = await presignRes.json();
        if (!presignData.presignedUrl) {
          throw new Error("No presigned URL returned");
        }

        // Step 1b: Upload directly to DO Spaces
        const uploadRes = await fetch(presignData.presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": uploadFile.type || "text/csv",
          },
          body: uploadFile,
        });

        if (!uploadRes.ok) {
          throw new Error(`Direct upload failed: ${uploadRes.status}`);
        }

        storagePath = presignData.storagePath;
        toast.success("File uploaded to storage!");
      } else {
        // Small file: Use regular upload through API
        const storageForm = new FormData();
        storageForm.append("file", uploadFile);
        storageForm.append("folder", folder);
        storageForm.append("filename", uploadFile.name);
        storageForm.append("tags", uploadTags);

        const storageRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: storageForm,
        });

        if (!storageRes.ok) {
          const text = await storageRes.text().catch(() => "");
          const isHtml = text.trim().startsWith("<");
          const msg = isHtml
            ? `Storage upload failed: server returned HTML (status ${storageRes.status})`
            : text || `Storage upload failed: HTTP ${storageRes.status}`;
          throw new Error(msg);
        }

        const storageData = await storageRes.json().catch(async () => {
          const txt = await storageRes.text().catch(() => "");
          throw new Error(txt || "Invalid JSON from storage upload");
        });

        storagePath = storageData.storagePath;
        if (!storagePath) throw new Error("No storagePath returned from storage upload");
      }

      // Step 2: Trigger import (async processing) using /api/buckets/import
      const importRes = await fetch("/api/buckets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });

      if (!importRes.ok) {
        const text = await importRes.text().catch(() => "");
        const isHtml = text.trim().startsWith("<");
        const msg = isHtml
          ? `Import failed: server returned HTML (status ${importRes.status})`
          : text || `Import failed: HTTP ${importRes.status}`;
        throw new Error(msg);
      }

      const importData = await importRes.json().catch(async () => {
        const txt = await importRes.text().catch(() => "");
        throw new Error(txt || "Invalid JSON from import");
      });

      if (importData.error) throw new Error(importData.error);

      setUploadResult({
        success: true,
        message: importData.success ? "CSV uploaded and import started" : importData.message || "Import started",
        stats: importData.stats || importData.bucket?.stats,
      });
      toast.success("CSV uploaded and import started!");

      // Refresh data lakes
      const refreshResponse = await fetch("/api/buckets?perPage=100");
      const refreshData = await refreshResponse.json();
      if (refreshData.buckets) {
        setDataLakes(refreshData.buckets);
      }

      // Reset form after success
      setTimeout(() => {
        setShowUploadDialog(false);
        setUploadFile(null);
        setUploadName("");
        setUploadDescription("");
        setUploadTags("");
        setUploadResult(null);
      }, 2000);
    } catch (error) {
      console.error("Upload failed:", error);
      const msg = error instanceof Error ? error.message : "Upload failed";
      setUploadResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Navigate to bucket/data lake detail page
  const viewDataLakeRecords = (lake: DataLake) => {
    router.push(
      `/t/${window.location.pathname.split("/")[2]}/sectors/${lake.id}`,
    );
  };

  // Enrichment state for data lake cards
  const [enrichingLakeId, setEnrichingLakeId] = useState<string | null>(null);

  // Push to leads state
  const [pushingLakeId, setPushingLakeId] = useState<string | null>(null);

  // Quick enrich a data lake
  const handleQuickEnrich = async (
    lake: DataLake,
    enrichType: "apollo" | "skip_trace",
  ) => {
    setEnrichingLakeId(lake.id);
    try {
      const response = await fetch(`/api/buckets/${lake.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxRecords: 100, enrichType }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(
          `Enriched ${data.results.enriched} records with ${enrichType === "apollo" ? "Apollo" : "Skip Trace"}`,
        );
        // Refresh data lakes
        const refreshResponse = await fetch("/api/buckets?perPage=100");
        const refreshData = await refreshResponse.json();
        if (refreshData.buckets) {
          setDataLakes(refreshData.buckets);
        }
      } else {
        toast.error(data.error || "Enrichment failed");
      }
    } catch (error) {
      console.error("Enrichment failed:", error);
      toast.error("Enrichment failed");
    } finally {
      setEnrichingLakeId(null);
    }
  };

  // Push data lake records to leads table
  const handlePushToLeads = async (lake: DataLake) => {
    if (!teamId) {
      toast.error("Team ID not found");
      return;
    }

    setPushingLakeId(lake.id);
    try {
      const response = await fetch(`/api/buckets/${lake.id}/push-to-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          requirePhone: false,
          requireEnriched: false,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(
          `Pushed ${data.results.pushed} leads to database! (${data.results.skipped} skipped, ${data.results.duplicates} duplicates)`,
        );
        router.push(`/t/${teamId}/leads`);
      } else {
        toast.error(data.error || "Push to leads failed");
      }
    } catch (error) {
      console.error("Push to leads failed:", error);
      toast.error("Push to leads failed");
    } finally {
      setPushingLakeId(null);
    }
  };

  // Data Lake Card component
  const DataLakeCard = ({ lake }: { lake: DataLake }) => {
    const isSelected = selectedDataLake?.id === lake.id;
    const isEnriching = enrichingLakeId === lake.id;
    const isPushing = pushingLakeId === lake.id;
    const unenrichedCount = lake.totalLeads - lake.enrichedLeads;
    // Contactable = enriched records (have mobile phone from skip trace)
    const contactableCount = lake.contactableLeads ?? lake.enrichedLeads;
    const contactableProgress = Math.min(
      (contactableCount / CONTACTABLE_TARGET) * 100,
      100,
    );
    const isReadyForSMS = contactableCount >= CONTACTABLE_TARGET;

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
          isSelected && "ring-2 ring-primary border-primary",
          isReadyForSMS && "border-green-500/50",
        )}
        onClick={() => setSelectedDataLake(lake)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <HardDrive className="h-5 w-5 text-blue-600" />
            </div>
            <Badge variant="outline" className="text-xs">
              {formatNumber(lake.totalLeads)} records
            </Badge>
          </div>
          <CardTitle className="text-sm mt-2">{lake.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {lake.description || `Source: ${lake.source}`}
          </p>

          {/* Contactable Progress Bar */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span
                className={cn(
                  "font-medium",
                  isReadyForSMS ? "text-green-600" : "text-muted-foreground",
                )}
              >
                {formatNumber(contactableCount)} /{" "}
                {formatNumber(CONTACTABLE_TARGET)} contactable
              </span>
              {isReadyForSMS && (
                <Badge className="bg-green-600 text-xs">Ready for SMS</Badge>
              )}
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  isReadyForSMS ? "bg-green-500" : "bg-blue-500",
                )}
                style={{ width: `${contactableProgress}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {formatNumber(lake.enrichedLeads)} enriched
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {formatNumber(lake.contactedLeads)} contacted
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                viewDataLakeRecords(lake);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/t/${window.location.pathname.split("/")[2]}/sectors/${lake.id}?action=sms`,
                );
              }}
            >
              <Send className="h-3 w-3 mr-1" />
              SMS
            </Button>
          </div>

          {/* Push to Leads button - converts bucket to database leads */}
          <div className="mt-2">
            <Button
              size="sm"
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={isPushing}
              onClick={(e) => {
                e.stopPropagation();
                handlePushToLeads(lake);
              }}
            >
              {isPushing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Database className="h-3 w-3 mr-1" />
              )}
              {isPushing ? "Pushing..." : "Push to Leads"}
            </Button>
          </div>

          {/* Enrich buttons - only show if there are unenriched records */}
          {unenrichedCount > 0 && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                disabled={isEnriching}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickEnrich(lake, "apollo");
                }}
              >
                {isEnriching ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Users className="h-3 w-3 mr-1" />
                )}
                Apollo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-purple-500 text-purple-600 hover:bg-purple-50"
                disabled={isEnriching}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickEnrich(lake, "skip_trace");
                }}
              >
                {isEnriching ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Home className="h-3 w-3 mr-1" />
                )}
                Skip Trace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const activeWorkspaceData = SECTOR_WORKSPACES.find(
    (w) => w.id === activeWorkspace,
  );

  const filteredSectors = getAllSectors().filter(
    (sector) =>
      sector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sector.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sector.sicCodes?.some((code) => code.includes(searchQuery)),
  );

  const handleSectorSelect = (sector: Sector) => {
    setSelectedSector(sector);
  };

  const getSectorRecordCount = (sectorId: string): number => {
    return sectorStats[sectorId]?.totalRecords || 0;
  };

  const formatNumber = (num: number | undefined | null): string => {
    const n = num ?? 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const SectorCard = ({ sector }: { sector: Sector }) => {
    const Icon = sector.icon;
    const stats = sectorStats[sector.id];
    const isSelected = selectedSector?.id === sector.id;

    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
          isSelected && "ring-2 ring-primary border-primary",
        )}
        onClick={() => handleSectorSelect(sector)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className={cn("p-2 rounded-lg", sector.bgColor)}>
              <Icon className={cn("h-5 w-5", sector.color)} />
            </div>
            <Badge variant="outline" className="text-xs">
              {formatNumber(getSectorRecordCount(sector.id))} records
            </Badge>
          </div>
          <CardTitle className="text-sm mt-2">{sector.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {sector.description}
          </p>
          {stats && (
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {formatNumber(stats.enrichedRecords)} enriched
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {formatNumber(stats.contactedRecords)} contacted
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const WorkspaceOverview = ({ workspace }: { workspace: SectorWorkspace }) => {
    const Icon = workspace.icon;
    const totalRecords = workspace.sectors.reduce(
      (acc, s) => acc + getSectorRecordCount(s.id),
      0,
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg bg-muted")}>
              <Icon className={cn("h-6 w-6", workspace.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{workspace.name}</h3>
              <p className="text-sm text-muted-foreground">
                {workspace.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatNumber(totalRecords)}</p>
            <p className="text-sm text-muted-foreground">total records</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {workspace.sectors.map((sector) => (
            <SectorCard key={sector.id} sector={sector} />
          ))}
        </div>
      </div>
    );
  };

  const SelectedSectorDetails = () => {
    if (!selectedSector) return null;
    const Icon = selectedSector.icon;
    const stats = sectorStats[selectedSector.id];

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-lg", selectedSector.bgColor)}>
                <Icon className={cn("h-6 w-6", selectedSector.color)} />
              </div>
              <div>
                <CardTitle>{selectedSector.name}</CardTitle>
                <CardDescription>{selectedSector.description}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  // Build query params from sector filters
                  const params = new URLSearchParams();
                  if (selectedSector.sicCodes?.length) {
                    params.set("sicCodes", selectedSector.sicCodes.join(","));
                  }
                  if (selectedSector.filters) {
                    Object.entries(selectedSector.filters).forEach(([k, v]) => {
                      params.set(k, String(v));
                    });
                  }
                  params.set("sectorId", selectedSector.id);
                  params.set("sectorName", selectedSector.name);
                  router.push(
                    `/t/${window.location.pathname.split("/")[2]}/leads/import-companies?${params.toString()}`,
                  );
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                View Records
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">
                {formatNumber(stats?.totalRecords || 0)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Enriched</p>
              <p className="text-2xl font-bold">
                {formatNumber(stats?.enrichedRecords || 0)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Contacted</p>
              <p className="text-2xl font-bold">
                {formatNumber(stats?.contactedRecords || 0)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">
                {stats?.enrichedRecords && stats?.contactedRecords
                  ? `${((stats.contactedRecords / stats.enrichedRecords) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>
          </div>

          {/* Sector-specific filters */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Active Filters</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectedSector.filters).map(([key, value]) => (
                <Badge key={key} variant="outline">
                  {key}: {String(value)}
                </Badge>
              ))}
              {selectedSector.sicCodes &&
                selectedSector.sicCodes.length > 0 && (
                  <Badge variant="outline">
                    SIC: {selectedSector.sicCodes.slice(0, 3).join(", ")}
                    {selectedSector.sicCodes.length > 3 &&
                      ` +${selectedSector.sicCodes.length - 3}`}
                  </Badge>
                )}
              {selectedSector.propertyTypes && (
                <Badge variant="outline">
                  Property: {selectedSector.propertyTypes.join(", ")}
                </Badge>
              )}
              {selectedSector.leadTypes && (
                <Badge variant="outline">
                  Lead Type: {selectedSector.leadTypes.join(", ")}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-8 w-8" />
              Sector Workspaces
            </h2>
            <p className="text-muted-foreground mt-1">
              Organize and manage your data by industry sectors
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Records
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(
                  Object.values(sectorStats).reduce(
                    (acc, s) => acc + s.totalRecords,
                    0,
                  ),
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                across all sectors
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Data Sources
              </CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSources.length}</div>
              <p className="text-xs text-muted-foreground">connected sources</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enriched</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(
                  Object.values(sectorStats).reduce(
                    (acc, s) => acc + s.enrichedRecords,
                    0,
                  ),
                )}
              </div>
              <p className="text-xs text-muted-foreground">with contact data</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Sectors
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(sectorStats).length}
              </div>
              <p className="text-xs text-muted-foreground">with data</p>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* PIPELINE OVERVIEW - Blocked, Batched, Grouped Visibility */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <Card className="border-2 border-blue-500/30 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Pipeline Overview
                  <Badge className="bg-blue-600 ml-2">
                    {formatNumber(
                      pipelineStats.raw +
                      pipelineStats.skip_traced +
                      pipelineStats.validated +
                      pipelineStats.ready +
                      pipelineStats.blocked +
                      pipelineStats.sent
                    )} Total
                  </Badge>
                </CardTitle>
                <CardDescription>
                  See exactly where your leads are - RAW → SKIP TRACED → VALIDATED → READY → SENT
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Refresh pipeline stats
                  toast.info("Refreshing pipeline stats...");
                  window.location.reload();
                }}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pipeline Flow Visualization */}
            <div className="grid grid-cols-6 gap-2">
              {/* RAW */}
              <div
                className="p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: PIPELINE_STATUS_CONFIG.raw.bgColor }}
              >
                <div className="text-2xl font-bold" style={{ color: PIPELINE_STATUS_CONFIG.raw.color }}>
                  {formatNumber(pipelineStats.raw)}
                </div>
                <div className="text-xs font-medium" style={{ color: PIPELINE_STATUS_CONFIG.raw.color }}>
                  RAW
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Not processed
                </div>
              </div>

              {/* SKIP TRACED */}
              <div
                className="p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: PIPELINE_STATUS_CONFIG.skip_traced.bgColor }}
              >
                <div className="text-2xl font-bold" style={{ color: PIPELINE_STATUS_CONFIG.skip_traced.color }}>
                  {formatNumber(pipelineStats.skip_traced)}
                </div>
                <div className="text-xs font-medium" style={{ color: PIPELINE_STATUS_CONFIG.skip_traced.color }}>
                  SKIP TRACED
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  $0.02/lead
                </div>
              </div>

              {/* VALIDATED */}
              <div
                className="p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: PIPELINE_STATUS_CONFIG.validated.bgColor }}
              >
                <div className="text-2xl font-bold" style={{ color: PIPELINE_STATUS_CONFIG.validated.color }}>
                  {formatNumber(pipelineStats.validated)}
                </div>
                <div className="text-xs font-medium" style={{ color: PIPELINE_STATUS_CONFIG.validated.color }}>
                  VALIDATED
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Trestle scored
                </div>
              </div>

              {/* READY */}
              <div
                className="p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: PIPELINE_STATUS_CONFIG.ready.bgColor }}
              >
                <div className="text-2xl font-bold" style={{ color: PIPELINE_STATUS_CONFIG.ready.color }}>
                  {formatNumber(pipelineStats.ready)}
                </div>
                <div className="text-xs font-medium" style={{ color: PIPELINE_STATUS_CONFIG.ready.color }}>
                  READY
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  SMS ready
                </div>
              </div>

              {/* BLOCKED */}
              <div
                className="p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: PIPELINE_STATUS_CONFIG.blocked.bgColor }}
              >
                <div className="text-2xl font-bold" style={{ color: PIPELINE_STATUS_CONFIG.blocked.color }}>
                  {formatNumber(pipelineStats.blocked)}
                </div>
                <div className="text-xs font-medium" style={{ color: PIPELINE_STATUS_CONFIG.blocked.color }}>
                  BLOCKED
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  DNC/Litigator
                </div>
              </div>

              {/* SENT */}
              <div
                className="p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: PIPELINE_STATUS_CONFIG.sent.bgColor }}
              >
                <div className="text-2xl font-bold" style={{ color: PIPELINE_STATUS_CONFIG.sent.color }}>
                  {formatNumber(pipelineStats.sent)}
                </div>
                <div className="text-xs font-medium" style={{ color: PIPELINE_STATUS_CONFIG.sent.color }}>
                  SENT
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  In campaign
                </div>
              </div>
            </div>

            {/* Flow Arrows */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-1">
              <span className="text-xs">CSV Upload</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs font-medium text-purple-600">Tracerfy ($0.02)</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs">Trestle (optional)</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs font-medium text-green-600">SMS Campaign</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs font-medium text-amber-600">2K/day SignalHouse</span>
            </div>

            {/* Blocked Breakdown + Quality Stats */}
            <div className="grid grid-cols-2 gap-4">
              {/* Blocked Breakdown */}
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="h-4 w-4 text-red-600" />
                  <span className="font-semibold text-red-700 dark:text-red-400">Blocked Breakdown</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">DNC (Do Not Call)</span>
                    <span className="font-medium text-red-600">{formatNumber(pipelineStats.blockedDNC)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Litigator</span>
                    <span className="font-medium text-red-600">{formatNumber(pipelineStats.blockedLitigator)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Invalid/Disconnected</span>
                    <span className="font-medium text-red-600">{formatNumber(pipelineStats.blockedInvalid)}</span>
                  </div>
                </div>
              </div>

              {/* Quality Stats */}
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-400">Contactable Quality</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> With Phone
                    </span>
                    <span className="font-medium text-green-600">{formatNumber(pipelineStats.withPhone)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="h-3 w-3" /> With Mobile
                    </span>
                    <span className="font-medium text-green-600">{formatNumber(pipelineStats.withMobile)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" /> With Email
                    </span>
                    <span className="font-medium text-blue-600">{formatNumber(pipelineStats.withEmail)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SMS Campaign Ready Indicator */}
            {pipelineStats.ready >= 2000 && (
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-500 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <span className="font-bold text-green-700">Ready for SMS Campaign!</span>
                    <span className="text-sm text-green-600 ml-2">
                      {formatNumber(pipelineStats.ready)} leads ready • 2K/day SignalHouse approved
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => router.push(`/t/${teamId}/campaigns/new`)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Start Campaign
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/t/${teamId}/leads?pipelineStatus=blocked`)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Ban className="h-4 w-4 mr-2" />
                View Blocked ({formatNumber(pipelineStats.blocked)})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/t/${teamId}/leads?pipelineStatus=ready`)}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                View Ready ({formatNumber(pipelineStats.ready)})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/t/${teamId}/skip-trace`)}
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Skip Trace RAW ({formatNumber(pipelineStats.raw)})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/t/${teamId}/leads?pipelineStatus=sent`)}
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <Send className="h-4 w-4 mr-2" />
                View Sent ({formatNumber(pipelineStats.sent)})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selected Sector Details */}
        {selectedSector && <SelectedSectorDetails />}

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sectors by name or SIC code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedSector && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSector(null)}
            >
              Clear Selection
            </Button>
          )}
        </div>

        {/* Workspace Tabs */}
        <Tabs
          value={activeWorkspace}
          onValueChange={setActiveWorkspace}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            {/* DATA LAKES TAB - Shows real uploaded buckets */}
            <TabsTrigger value="data_lakes" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="hidden sm:inline">Data Lakes</span>
              {dataLakes.length > 0 && (
                <Badge variant="default" className="ml-1 text-xs bg-blue-600">
                  {dataLakes.length}
                </Badge>
              )}
            </TabsTrigger>
            {SECTOR_WORKSPACES.map((ws) => {
              const Icon = ws.icon;
              const recordCount = ws.sectors.reduce(
                (acc, s) => acc + getSectorRecordCount(s.id),
                0,
              );
              return (
                <TabsTrigger
                  key={ws.id}
                  value={ws.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{ws.name}</span>
                  {recordCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {formatNumber(recordCount)}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            {/* DATA LAKES CONTENT - Real uploaded buckets */}
            <TabsContent value="data_lakes" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <HardDrive className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Your Data Lakes</h3>
                      <p className="text-sm text-muted-foreground">
                        Uploaded CSV databases and saved searches
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatNumber(
                        dataLakes.reduce((acc, l) => acc + l.totalLeads, 0),
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      total records
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : dataLakes.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        No Data Lakes Yet
                      </h3>
                      <p className="text-muted-foreground text-center max-w-md mb-4">
                        Upload CSV databases from USBizData, save property
                        searches, or import leads to create data lakes.
                      </p>
                      <Button onClick={() => setShowUploadDialog(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV Database
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {dataLakes.map((lake) => (
                      <DataLakeCard key={lake.id} lake={lake} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {SECTOR_WORKSPACES.map((ws) => (
              <TabsContent key={ws.id} value={ws.id} className="mt-0">
                {searchQuery ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Showing{" "}
                      {
                        filteredSectors.filter(
                          (s) =>
                            s.category === ws.id.replace("_", "") ||
                            (ws.id === "real_estate" &&
                              s.category === "real_estate") ||
                            (ws.id === "financial" &&
                              s.category === "financial") ||
                            (ws.id === "business" &&
                              s.category === "business") ||
                            (ws.id === "geographic" &&
                              s.category === "geographic"),
                        ).length
                      }{" "}
                      results
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredSectors
                        .filter(
                          (s) =>
                            s.category === ws.id.replace("_", "") ||
                            (ws.id === "real_estate" &&
                              s.category === "real_estate") ||
                            (ws.id === "financial" &&
                              s.category === "financial") ||
                            (ws.id === "business" &&
                              s.category === "business") ||
                            (ws.id === "geographic" &&
                              s.category === "geographic"),
                        )
                        .map((sector) => (
                          <SectorCard key={sector.id} sector={sector} />
                        ))}
                    </div>
                  </div>
                ) : (
                  <WorkspaceOverview workspace={ws} />
                )}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* CAMPAIGN BLOCKS - Your Local Lead Files */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <Card className="border-2 border-purple-500/30 bg-purple-50/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-600" />
                  Campaign Blocks
                  <Badge className="bg-purple-600 ml-2">669 Files</Badge>
                </CardTitle>
                <CardDescription>
                  Your local USBizData files organized by industry - ready for upload
                </CardDescription>
              </div>
              <Button
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Blocks
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* Consultants Block */}
              <Card className="hover:border-purple-500 cursor-pointer transition-colors" onClick={() => setShowUploadDialog(true)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-blue-600 border-blue-600">SIC 8742 / 8748</Badge>
                    <span className="text-xs text-muted-foreground">168 files</span>
                  </div>
                  <h4 className="font-semibold text-lg">Consultants</h4>
                  <p className="text-sm text-muted-foreground">Management & Business Consulting</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-600">~168K</span>
                    <span className="text-xs text-muted-foreground">leads</span>
                  </div>
                </CardContent>
              </Card>

              {/* Plumbing Block */}
              <Card className="hover:border-purple-500 cursor-pointer transition-colors" onClick={() => setShowUploadDialog(true)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-orange-600 border-orange-600">SIC 1711</Badge>
                    <span className="text-xs text-muted-foreground">110 files</span>
                  </div>
                  <h4 className="font-semibold text-lg">Plumbing</h4>
                  <p className="text-sm text-muted-foreground">Plumbing, Heating, AC</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-600">~110K</span>
                    <span className="text-xs text-muted-foreground">leads</span>
                  </div>
                </CardContent>
              </Card>

              {/* Realtors Block */}
              <Card className="hover:border-purple-500 cursor-pointer transition-colors" onClick={() => setShowUploadDialog(true)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">SIC 6531</Badge>
                    <span className="text-xs text-muted-foreground">390 files</span>
                  </div>
                  <h4 className="font-semibold text-lg">Realtors</h4>
                  <p className="text-sm text-muted-foreground">Real Estate Agents & Brokers</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-600">~390K</span>
                    <span className="text-xs text-muted-foreground">leads</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Files:</span>
                  <span className="ml-2 font-bold">669</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Est. Leads:</span>
                  <span className="ml-2 font-bold text-purple-600">~668K</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Skip Trace Cost:</span>
                  <span className="ml-2 font-bold text-green-600">~$13,360</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                C:\Users\colep\Downloads\CampaignBlocks\
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Data Sources
                </CardTitle>
                <CardDescription>
                  Imported files and connected APIs
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Sync started for all sources")}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Sync All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dataSources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No data sources yet</p>
                <p className="text-sm">
                  Import a CSV or connect an API to get started
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowUploadDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {dataSources.map((source) => {
                  const sector = source.sectorId
                    ? getSectorById(source.sectorId)
                    : null;
                  return (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded">
                          {source.sourceType === "csv" ? (
                            <FileSpreadsheet className="h-4 w-4" />
                          ) : (
                            <Database className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{source.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.sourceProvider} •{" "}
                            {formatNumber(source.totalRows)} rows
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sector && (
                          <Badge
                            variant="outline"
                            className={cn("text-xs", sector.color)}
                          >
                            {sector.shortName}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            source.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {source.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CSV Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload CSV Database
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file from USBizData or any other source. We'll
              auto-detect columns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadFile(file);
                      if (!uploadName) {
                        setUploadName(
                          file.name.replace(".csv", "").replace(/_/g, " "),
                        );
                      }
                    }
                  }}
                  className="flex-1"
                />
              </div>
              {uploadFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {uploadFile.name} (
                  {(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Data Lake Name</Label>
              <Input
                id="name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g., US Pizza Businesses"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="e.g., 1.2M pizza businesses from USBizData SIC 5812"
                rows={2}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g., food, restaurants, b2b"
              />
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div
                className={cn(
                  "rounded-lg p-4",
                  uploadResult.success
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-red-50 dark:bg-red-900/20",
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {uploadResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      uploadResult.success ? "text-green-700" : "text-red-700",
                    )}
                  >
                    {uploadResult.success
                      ? "Upload Successful"
                      : "Upload Failed"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {uploadResult.message}
                </p>
                {uploadResult.stats && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {sf(uploadResult.stats.total)}
                      </div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {sf(uploadResult.stats.withPhone)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Phones
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {sf(uploadResult.stats.withEmail)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Emails
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {sf(uploadResult.stats.withAddress)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Enrichable
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadFile || !uploadName}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
