"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Upload,
  Download,
  Search,
  Sparkles,
  FileSpreadsheet,
  HardDrive,
  Cloud,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Layers,
  GitMerge,
  Filter,
  BarChart3,
  ArrowUpDown,
  Cpu,
  Zap,
  Table,
  FolderOpen,
  CircleDot,
  Settings,
  Play,
  Pause,
  Eye,
  Code,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface DataSource {
  id: string;
  name: string;
  type: "csv" | "s3" | "postgres" | "api" | "manual";
  status: "connected" | "syncing" | "error" | "idle";
  records: number;
  last_sync: Date | null;
  schema_fields: number;
  quality_score: number;
}

interface ETLPipeline {
  id: string;
  name: string;
  source: string;
  destination: string;
  schedule: string;
  status: "running" | "scheduled" | "paused" | "failed";
  last_run: Date | null;
  records_processed: number;
  error_rate: number;
}

interface DataQualityCheck {
  id: string;
  field: string;
  check_type: "null" | "format" | "duplicate" | "range" | "reference";
  passed: number;
  failed: number;
  status: "healthy" | "warning" | "critical";
}

interface CrossReference {
  id: string;
  source_a: string;
  source_b: string;
  match_field: string;
  matched: number;
  unmatched_a: number;
  unmatched_b: number;
  last_run: Date;
}

interface AgentMetrics {
  total_records: number;
  data_sources: number;
  pipelines_active: number;
  quality_score: number;
  cross_references: number;
  processing_queue: number;
}

// ============================================================================
// MOCK DATA
// ============================================================================

function generateMockSources(): DataSource[] {
  return [
    {
      id: "usbiz_hotels",
      name: "USBizData Hotels",
      type: "s3",
      status: "connected",
      records: 433000,
      last_sync: new Date("2024-12-12"),
      schema_fields: 24,
      quality_score: 94,
    },
    {
      id: "usbiz_auto",
      name: "USBizData Auto Dealers",
      type: "s3",
      status: "syncing",
      records: 409121,
      last_sync: new Date("2024-12-11"),
      schema_fields: 24,
      quality_score: 91,
    },
    {
      id: "usbiz_rv",
      name: "USBizData Campgrounds",
      type: "s3",
      status: "connected",
      records: 16366,
      last_sync: new Date("2024-12-10"),
      schema_fields: 24,
      quality_score: 96,
    },
    {
      id: "usbiz_trucking",
      name: "USBizData Trucking",
      type: "s3",
      status: "connected",
      records: 285000,
      last_sync: new Date("2024-12-08"),
      schema_fields: 24,
      quality_score: 89,
    },
    {
      id: "usbiz_aircraft",
      name: "USBizData Aircraft",
      type: "csv",
      status: "idle",
      records: 106625,
      last_sync: new Date("2024-12-05"),
      schema_fields: 24,
      quality_score: 92,
    },
    {
      id: "ny_business",
      name: "NY Business Database",
      type: "s3",
      status: "connected",
      records: 5500000,
      last_sync: new Date("2024-12-01"),
      schema_fields: 18,
      quality_score: 78,
    },
    {
      id: "apollo_enriched",
      name: "Apollo Enriched",
      type: "api",
      status: "connected",
      records: 125000,
      last_sync: new Date(),
      schema_fields: 45,
      quality_score: 98,
    },
    {
      id: "skip_trace",
      name: "Skip Trace Results",
      type: "postgres",
      status: "connected",
      records: 450000,
      last_sync: new Date(),
      schema_fields: 12,
      quality_score: 95,
    },
  ];
}

function generateMockPipelines(): ETLPipeline[] {
  return [
    {
      id: "etl_1",
      name: "USBizData → Datalake",
      source: "DigitalOcean Spaces",
      destination: "Datalake",
      schedule: "Daily 2AM",
      status: "scheduled",
      last_run: new Date("2024-12-12T02:00:00"),
      records_processed: 125000,
      error_rate: 0.2,
    },
    {
      id: "etl_2",
      name: "Enrichment → Companies",
      source: "Apollo API",
      destination: "Companies Table",
      schedule: "Hourly",
      status: "running",
      last_run: new Date(),
      records_processed: 2340,
      error_rate: 1.5,
    },
    {
      id: "etl_3",
      name: "Cross-Reference Match",
      source: "Datalake",
      destination: "Matched Leads",
      schedule: "Every 6h",
      status: "scheduled",
      last_run: new Date("2024-12-12T18:00:00"),
      records_processed: 45000,
      error_rate: 0.0,
    },
    {
      id: "etl_4",
      name: "NY → Sector Tag",
      source: "NY Business",
      destination: "Sector Labels",
      schedule: "Weekly",
      status: "paused",
      last_run: new Date("2024-12-08"),
      records_processed: 5500000,
      error_rate: 3.2,
    },
    {
      id: "etl_5",
      name: "Skip Trace Merge",
      source: "Skip Trace API",
      destination: "Contact Info",
      schedule: "On Demand",
      status: "scheduled",
      last_run: new Date("2024-12-11"),
      records_processed: 8500,
      error_rate: 0.8,
    },
  ];
}

function generateMockQualityChecks(): DataQualityCheck[] {
  return [
    {
      id: "q1",
      field: "email",
      check_type: "format",
      passed: 425000,
      failed: 8000,
      status: "healthy",
    },
    {
      id: "q2",
      field: "phone",
      check_type: "format",
      passed: 380000,
      failed: 53000,
      status: "warning",
    },
    {
      id: "q3",
      field: "company_name",
      check_type: "null",
      passed: 433000,
      failed: 0,
      status: "healthy",
    },
    {
      id: "q4",
      field: "address",
      check_type: "null",
      passed: 410000,
      failed: 23000,
      status: "warning",
    },
    {
      id: "q5",
      field: "sic_code",
      check_type: "format",
      passed: 420000,
      failed: 13000,
      status: "healthy",
    },
    {
      id: "q6",
      field: "contact_name",
      check_type: "duplicate",
      passed: 390000,
      failed: 43000,
      status: "warning",
    },
  ];
}

function generateMockCrossRefs(): CrossReference[] {
  return [
    {
      id: "cr1",
      source_a: "USBizData Hotels",
      source_b: "Skip Trace",
      match_field: "address",
      matched: 125000,
      unmatched_a: 308000,
      unmatched_b: 0,
      last_run: new Date(),
    },
    {
      id: "cr2",
      source_a: "USBizData Auto",
      source_b: "Apollo Enriched",
      match_field: "company_name",
      matched: 45000,
      unmatched_a: 364121,
      unmatched_b: 80000,
      last_run: new Date(),
    },
    {
      id: "cr3",
      source_a: "NY Business",
      source_b: "Datalake Sectors",
      match_field: "sic_code",
      matched: 2500000,
      unmatched_a: 3000000,
      unmatched_b: 0,
      last_run: new Date("2024-12-10"),
    },
  ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LuciDataAgent() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [pipelines, setPipelines] = useState<ETLPipeline[]>([]);
  const [qualityChecks, setQualityChecks] = useState<DataQualityCheck[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics>({
    total_records: 0,
    data_sources: 0,
    pipelines_active: 0,
    quality_score: 0,
    cross_references: 0,
    processing_queue: 0,
  });
  const [activeTab, setActiveTab] = useState("sources");
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize mock data
  useEffect(() => {
    const mockSources = generateMockSources();
    const mockPipelines = generateMockPipelines();
    const mockQuality = generateMockQualityChecks();
    const mockCrossRefs = generateMockCrossRefs();

    setSources(mockSources);
    setPipelines(mockPipelines);
    setQualityChecks(mockQuality);
    setCrossRefs(mockCrossRefs);

    const totalRecords = mockSources.reduce((sum, s) => sum + s.records, 0);
    const avgQuality =
      mockSources.reduce((sum, s) => sum + s.quality_score, 0) /
      mockSources.length;

    setMetrics({
      total_records: totalRecords,
      data_sources: mockSources.length,
      pipelines_active: mockPipelines.filter(
        (p) => p.status === "running" || p.status === "scheduled",
      ).length,
      quality_score: Math.round(avgQuality),
      cross_references: mockCrossRefs.reduce((sum, cr) => sum + cr.matched, 0),
      processing_queue: 15420,
    });
  }, []);

  // Simulate pipeline progress
  useEffect(() => {
    const interval = setInterval(() => {
      setPipelines((prev) =>
        prev.map((pipeline) => {
          if (pipeline.status === "running") {
            return {
              ...pipeline,
              records_processed:
                pipeline.records_processed +
                Math.floor(Math.random() * 100) +
                50,
            };
          }
          return pipeline;
        }),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Trigger sync
  const triggerSync = (sourceId: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id === sourceId) {
          toast.success(`Syncing ${s.name}...`);
          return { ...s, status: "syncing" };
        }
        return s;
      }),
    );

    setTimeout(() => {
      setSources((prev) =>
        prev.map((s) => {
          if (s.id === sourceId) {
            toast.success(`${s.name} sync complete`);
            return { ...s, status: "connected", last_sync: new Date() };
          }
          return s;
        }),
      );
    }, 3000);
  };

  // Run pipeline
  const runPipeline = (pipelineId: string) => {
    setPipelines((prev) =>
      prev.map((p) => {
        if (p.id === pipelineId) {
          toast.success(`Running pipeline: ${p.name}`);
          return { ...p, status: "running", last_run: new Date() };
        }
        return p;
      }),
    );
  };

  // Run cross-reference
  const runCrossRef = (crId: string) => {
    setIsProcessing(true);
    const cr = crossRefs.find((c) => c.id === crId);
    toast.info(`Running cross-reference: ${cr?.source_a} ↔ ${cr?.source_b}`);

    setTimeout(() => {
      setCrossRefs((prev) =>
        prev.map((c) => {
          if (c.id === crId) {
            const newMatched = c.matched + Math.floor(Math.random() * 5000);
            return { ...c, matched: newMatched, last_run: new Date() };
          }
          return c;
        }),
      );
      setIsProcessing(false);
      toast.success("Cross-reference complete");
    }, 2500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "running":
      case "scheduled":
        return "bg-green-600";
      case "syncing":
        return "bg-cyan-600 animate-pulse";
      case "paused":
      case "idle":
        return "bg-yellow-600";
      case "error":
      case "failed":
        return "bg-red-600";
      default:
        return "bg-zinc-600";
    }
  };

  const getQualityColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "critical":
        return "text-red-400";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Luci
              <Badge className="bg-red-600">DATA ENGINEER</Badge>
            </h2>
            <p className="text-zinc-400">
              ETL • Cross-Reference • Data Quality • Pattern Recognition
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300"
            onClick={() => toast.info("Running all scheduled pipelines...")}
          >
            <Play className="h-4 w-4 mr-2" />
            Run Pipelines
          </Button>
          <Button className="bg-red-600 hover:bg-red-700">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-6 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs">Total Records</span>
            </div>
            <p className="text-xl font-bold text-white">
              {(metrics.total_records / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <HardDrive className="h-4 w-4" />
              <span className="text-xs">Data Sources</span>
            </div>
            <p className="text-xl font-bold text-green-400">
              {metrics.data_sources}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <GitMerge className="h-4 w-4" />
              <span className="text-xs">Pipelines</span>
            </div>
            <p className="text-xl font-bold text-cyan-400">
              {metrics.pipelines_active} active
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Quality Score</span>
            </div>
            <p className="text-xl font-bold text-green-400">
              {metrics.quality_score}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-xs">Cross-Refs</span>
            </div>
            <p className="text-xl font-bold text-purple-400">
              {(metrics.cross_references / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Cpu className="h-4 w-4" />
              <span className="text-xs">Queue</span>
            </div>
            <p className="text-xl font-bold text-yellow-400">
              {metrics.processing_queue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger
            value="sources"
            className="data-[state=active]:bg-red-600"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Sources
          </TabsTrigger>
          <TabsTrigger
            value="pipelines"
            className="data-[state=active]:bg-orange-600"
          >
            <GitMerge className="h-4 w-4 mr-2" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger
            value="quality"
            className="data-[state=active]:bg-green-600"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Quality
          </TabsTrigger>
          <TabsTrigger
            value="crossref"
            className="data-[state=active]:bg-purple-600"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Cross-Ref
          </TabsTrigger>
          <TabsTrigger
            value="engine"
            className="data-[state=active]:bg-amber-600"
          >
            <Cpu className="h-4 w-4 mr-2" />♛ Engine
          </TabsTrigger>
        </TabsList>

        {/* Data Sources Tab */}
        <TabsContent value="sources" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Data Sources
                </CardTitle>
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            source.type === "s3"
                              ? "bg-orange-600/20"
                              : source.type === "api"
                                ? "bg-blue-600/20"
                                : source.type === "postgres"
                                  ? "bg-cyan-600/20"
                                  : "bg-zinc-700"
                          }`}
                        >
                          {source.type === "s3" && (
                            <Cloud className="h-4 w-4 text-orange-400" />
                          )}
                          {source.type === "api" && (
                            <Code className="h-4 w-4 text-blue-400" />
                          )}
                          {source.type === "postgres" && (
                            <Database className="h-4 w-4 text-cyan-400" />
                          )}
                          {source.type === "csv" && (
                            <FileSpreadsheet className="h-4 w-4 text-green-400" />
                          )}
                          {source.type === "manual" && (
                            <FolderOpen className="h-4 w-4 text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-white">
                            {source.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="outline"
                              className="text-xs border-zinc-600 text-zinc-400"
                            >
                              {source.type.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-zinc-500">
                              {source.schema_fields} fields
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(source.status)}>
                          {source.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-zinc-700"
                          onClick={() => triggerSync(source.id)}
                          disabled={source.status === "syncing"}
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${source.status === "syncing" ? "animate-spin" : ""}`}
                          />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-zinc-500">Records</span>
                        <p className="text-lg font-semibold text-white">
                          {source.records.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500">Quality</span>
                        <p
                          className={`text-lg font-semibold ${source.quality_score >= 90 ? "text-green-400" : source.quality_score >= 80 ? "text-yellow-400" : "text-red-400"}`}
                        >
                          {source.quality_score}%
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500">Last Sync</span>
                        <p className="text-sm text-zinc-300">
                          {source.last_sync
                            ? source.last_sync.toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                      <div className="flex items-end justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-zinc-700 text-zinc-400"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-zinc-700 text-zinc-400"
                        >
                          <Table className="h-3 w-3 mr-1" />
                          Schema
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ETL Pipelines Tab */}
        <TabsContent value="pipelines" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <GitMerge className="h-5 w-5" />
                  ETL Pipelines
                </CardTitle>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  <GitMerge className="h-4 w-4 mr-2" />
                  Create Pipeline
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pipelines.map((pipeline) => (
                  <div key={pipeline.id} className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            pipeline.status === "running"
                              ? "bg-cyan-400 animate-pulse"
                              : pipeline.status === "scheduled"
                                ? "bg-green-400"
                                : pipeline.status === "paused"
                                  ? "bg-yellow-400"
                                  : "bg-red-400"
                          }`}
                        />
                        <div>
                          <span className="font-medium text-white">
                            {pipeline.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                            <span>{pipeline.source}</span>
                            <span>→</span>
                            <span>{pipeline.destination}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-zinc-600 text-zinc-400 text-xs"
                        >
                          {pipeline.schedule}
                        </Badge>
                        <Badge className={getStatusColor(pipeline.status)}>
                          {pipeline.status}
                        </Badge>
                        {pipeline.status !== "running" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-zinc-700"
                            onClick={() => runPipeline(pipeline.id)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-zinc-500">Last Run</span>
                        <p className="text-zinc-300">
                          {pipeline.last_run
                            ? pipeline.last_run.toLocaleString()
                            : "Never"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500">
                          Records Processed
                        </span>
                        <p className="text-zinc-300">
                          {pipeline.records_processed.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500">
                          Error Rate
                        </span>
                        <p
                          className={
                            pipeline.error_rate > 2
                              ? "text-red-400"
                              : pipeline.error_rate > 1
                                ? "text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {pipeline.error_rate}%
                        </p>
                      </div>
                      <div className="flex items-end justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-zinc-700 text-zinc-400"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Logs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-zinc-700 text-zinc-400"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Quality Tab */}
        <TabsContent value="quality" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {qualityChecks.map((check) => {
                  const total = check.passed + check.failed;
                  const passRate = total > 0 ? (check.passed / total) * 100 : 0;

                  return (
                    <div key={check.id} className="p-4 bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-white capitalize">
                            {check.field}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-zinc-600 text-zinc-400 text-xs"
                          >
                            {check.check_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {check.status === "healthy" && (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          )}
                          {check.status === "warning" && (
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          )}
                          {check.status === "critical" && (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span
                            className={`text-sm font-medium ${getQualityColor(check.status)}`}
                          >
                            {passRate.toFixed(1)}% pass
                          </span>
                        </div>
                      </div>

                      <Progress value={passRate} className="h-2 mb-2" />

                      <div className="flex justify-between text-xs text-zinc-500">
                        <span className="text-green-400">
                          {check.passed.toLocaleString()} passed
                        </span>
                        <span className="text-red-400">
                          {check.failed.toLocaleString()} failed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross-Reference Tab */}
        <TabsContent value="crossref" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5" />
                  Cross-Reference
                </CardTitle>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  New Cross-Ref
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {crossRefs.map((cr) => {
                  const totalA = cr.matched + cr.unmatched_a;
                  const matchRateA =
                    totalA > 0 ? (cr.matched / totalA) * 100 : 0;

                  return (
                    <div key={cr.id} className="p-4 bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-white">
                            <Badge className="bg-zinc-700">{cr.source_a}</Badge>
                            <ArrowUpDown className="h-4 w-4 text-purple-400" />
                            <Badge className="bg-zinc-700">{cr.source_b}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-zinc-600 text-zinc-400 text-xs"
                          >
                            Match: {cr.match_field}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-purple-600 text-purple-400"
                            onClick={() => runCrossRef(cr.id)}
                            disabled={isProcessing}
                          >
                            <RefreshCw
                              className={`h-3 w-3 mr-1 ${isProcessing ? "animate-spin" : ""}`}
                            />
                            Run
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <span className="text-xs text-zinc-500">Matched</span>
                          <p className="text-lg font-semibold text-green-400">
                            {cr.matched.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500">
                            Unmatched ({cr.source_a})
                          </span>
                          <p className="text-lg font-semibold text-yellow-400">
                            {cr.unmatched_a.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500">
                            Match Rate
                          </span>
                          <p className="text-lg font-semibold text-purple-400">
                            {matchRateA.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500">
                            Last Run
                          </span>
                          <p className="text-sm text-zinc-300">
                            {cr.last_run.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chess Engine Tab */}
        <TabsContent value="engine" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Position Evaluation */}
            <Card className="bg-zinc-900 border-zinc-800 col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <span className="text-amber-400 text-xl">♛</span>
                  Position Evaluation
                  <Badge className="bg-amber-600 ml-2">Depth 12</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Evaluation Bar */}
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">
                        Data → Lead Conversion Potential
                      </span>
                      <span className="text-lg font-mono text-green-400">
                        +2.4
                      </span>
                    </div>
                    <div className="h-3 bg-zinc-700 rounded-full overflow-hidden flex">
                      <div
                        className="bg-white h-full"
                        style={{ width: "62%" }}
                      />
                      <div
                        className="bg-zinc-900 h-full"
                        style={{ width: "38%" }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      White (Your Data) has advantage. Unenriched records =
                      untapped potential.
                    </p>
                  </div>

                  {/* Best Moves */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                      <span className="text-amber-400">♞</span> Best Moves
                      (Recommended Actions)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border-l-4 border-green-500">
                        <div className="flex items-center gap-3">
                          <span className="text-green-400 font-mono">1.</span>
                          <div>
                            <p className="text-white font-medium">
                              Enrich Hotels → Skip Trace
                            </p>
                            <p className="text-xs text-zinc-500">
                              308,000 unenriched records with high owner
                              probability
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-mono">+0.8</p>
                          <p className="text-xs text-zinc-500">eval gain</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border-l-4 border-amber-500">
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400 font-mono">2.</span>
                          <div>
                            <p className="text-white font-medium">
                              Cross-Reference Auto Dealers ↔ Apollo
                            </p>
                            <p className="text-xs text-zinc-500">
                              364,121 unmatched - email capture opportunity
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-400 font-mono">+0.5</p>
                          <p className="text-xs text-zinc-500">eval gain</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-400 font-mono">3.</span>
                          <div>
                            <p className="text-white font-medium">
                              Push 2,000 enriched → Gianna Outreach
                            </p>
                            <p className="text-xs text-zinc-500">
                              Ready batch: phone + email verified
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-400 font-mono">+0.3</p>
                          <p className="text-xs text-zinc-500">eval gain</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Clock / Daily Mission */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  Daily Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-1">
                    Today's Objective
                  </p>
                  <p className="text-2xl font-bold text-white">5,000</p>
                  <p className="text-sm text-zinc-400">net new leads</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Data Sourced</span>
                      <span className="text-green-400">2,340 / 5,000</span>
                    </div>
                    <Progress value={46.8} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Enriched</span>
                      <span className="text-cyan-400">1,890 / 2,340</span>
                    </div>
                    <Progress value={80.7} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Pushed to Campaigns</span>
                      <span className="text-purple-400">1,200 / 1,890</span>
                    </div>
                    <Progress value={63.5} className="h-2" />
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-2">Opening Theory</p>
                  <p className="text-sm text-zinc-300 italic">
                    "Every day is a day to find data."
                  </p>
                  <p className="text-xs text-zinc-500">- Luci, Data Engineer</p>
                </div>
              </CardContent>
            </Card>

            {/* Threat Detection */}
            <Card className="bg-zinc-900 border-zinc-800 col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <span className="text-red-400">♜</span>
                  Threat Detection
                  <Badge
                    variant="outline"
                    className="border-zinc-600 text-zinc-400 ml-2"
                  >
                    Pattern Analysis
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 bg-zinc-800 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400">Stale Data</span>
                    </div>
                    <p className="text-lg font-semibold text-white">43,000</p>
                    <p className="text-xs text-zinc-500">
                      Records not touched in 30+ days
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg border-l-4 border-yellow-500">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-yellow-400">
                        Missing Phones
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-white">53,000</p>
                    <p className="text-xs text-zinc-500">Can't reach via SMS</p>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <span className="text-sm text-orange-400">
                        Duplicate Risk
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-white">12,500</p>
                    <p className="text-xs text-zinc-500">
                      Potential duplicate contacts
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400">
                        Campaign Ready
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-white">125,000</p>
                    <p className="text-xs text-zinc-500">Enriched & verified</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
