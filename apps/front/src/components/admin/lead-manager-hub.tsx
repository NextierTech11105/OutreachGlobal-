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
  Bot,
  Database,
  Upload,
  Zap,
  Users,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Target,
  Layers,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  Download,
  Settings,
  GitBranch,
  Calendar,
  ArrowRight,
  Sparkles,
  Send,
  BarChart3,
  AlertCircle,
  Building2,
  FileText,
  Workflow,
  CircleDot,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface DatalakeSector {
  id: string;
  name: string;
  label: string;
  sic_codes: string[];
  record_count: number;
  enriched_count: number;
  last_upload: Date | null;
  status: "active" | "paused" | "pending";
  color: string;
}

interface EnrichmentJob {
  id: string;
  sector_id: string;
  type: "skip_trace" | "apollo" | "email_verify" | "phone_verify";
  status: "queued" | "running" | "completed" | "failed";
  total: number;
  processed: number;
  enriched: number;
  started_at: Date;
  completed_at?: Date;
  cost_estimate: string;
}

interface WorkspaceWorkflow {
  id: string;
  name: string;
  workspace: string;
  trigger: "new_lead" | "response" | "no_response" | "hot_signal" | "calendar";
  actions: WorkflowAction[];
  enabled: boolean;
  leads_processed: number;
  conversions: number;
}

interface WorkflowAction {
  type: "sms" | "email" | "call" | "assign" | "tag" | "wait" | "enrich";
  config: Record<string, any>;
}

interface LeadAssignment {
  id: string;
  lead_name: string;
  company: string;
  sector: string;
  assigned_to: "gianna_outreach" | "gianna_inbound" | "calendar" | "campaign";
  priority: number;
  signals: string[];
  status: "pending" | "in_progress" | "completed" | "responded";
}

interface AgentMetrics {
  total_datalake_records: number;
  sectors_active: number;
  pending_enrichment: number;
  workflows_running: number;
  leads_assigned_today: number;
  response_rate: number;
  avg_response_time: string;
}

// ============================================================================
// SECTOR CONFIGURATION
// ============================================================================

const SECTOR_COLORS: Record<string, string> = {
  "hotel-motel": "bg-blue-500",
  "campgrounds-rv": "bg-green-500",
  "trucking": "bg-orange-500",
  "auto-dealers": "bg-purple-500",
  "auto-repair": "bg-red-500",
  "aircraft-parts": "bg-cyan-500",
  "restaurants": "bg-yellow-500",
  "construction": "bg-amber-500",
  "medical": "bg-pink-500",
  "dental": "bg-indigo-500",
  "real-estate": "bg-emerald-500",
  "logistics": "bg-violet-500",
};

const ENRICHMENT_TYPES = [
  { id: "skip_trace", label: "Skip Trace", icon: Search, cost: "$0.02/record" },
  { id: "apollo", label: "Apollo Enrich", icon: Sparkles, cost: "$0.10/record" },
  { id: "email_verify", label: "Email Verify", icon: Mail, cost: "$0.005/record" },
  { id: "phone_verify", label: "Phone Verify", icon: Phone, cost: "$0.01/record" },
];

const WORKFLOW_TRIGGERS = [
  { id: "new_lead", label: "New Lead Added", icon: Plus },
  { id: "response", label: "Inbound Response", icon: MessageSquare },
  { id: "no_response", label: "No Response (48h)", icon: Clock },
  { id: "hot_signal", label: "Hot Signal Detected", icon: Zap },
  { id: "calendar", label: "Calendar Event", icon: Calendar },
];

// ============================================================================
// MOCK DATA
// ============================================================================

function generateMockSectors(): DatalakeSector[] {
  return [
    { id: "hotel-motel", name: "hotel-motel", label: "Hotels & Motels", sic_codes: ["7011"], record_count: 433000, enriched_count: 125000, last_upload: new Date("2024-12-10"), status: "active", color: "bg-blue-500" },
    { id: "campgrounds-rv", name: "campgrounds-rv", label: "Campgrounds & RV", sic_codes: ["7033"], record_count: 16366, enriched_count: 8200, last_upload: new Date("2024-12-08"), status: "active", color: "bg-green-500" },
    { id: "trucking", name: "trucking", label: "Trucking & Freight", sic_codes: ["4213", "4214", "4215"], record_count: 285000, enriched_count: 95000, last_upload: new Date("2024-12-05"), status: "active", color: "bg-orange-500" },
    { id: "auto-dealers", name: "auto-dealers", label: "Auto Dealers", sic_codes: ["5511", "5521"], record_count: 409121, enriched_count: 180000, last_upload: new Date("2024-12-12"), status: "active", color: "bg-purple-500" },
    { id: "auto-repair", name: "auto-repair", label: "Auto Repair", sic_codes: ["7538", "7539", "7549", "7537"], record_count: 197414, enriched_count: 75000, last_upload: new Date("2024-12-11"), status: "active", color: "bg-red-500" },
    { id: "aircraft-parts", name: "aircraft-parts", label: "Aircraft Parts", sic_codes: ["3721", "3724", "3728"], record_count: 106625, enriched_count: 42000, last_upload: new Date("2024-12-09"), status: "pending", color: "bg-cyan-500" },
    { id: "ny-business", name: "ny-business", label: "NY Businesses", sic_codes: [], record_count: 5500000, enriched_count: 250000, last_upload: new Date("2024-12-01"), status: "paused", color: "bg-zinc-500" },
  ];
}

function generateMockJobs(): EnrichmentJob[] {
  return [
    { id: "job_1", sector_id: "hotel-motel", type: "skip_trace", status: "running", total: 5000, processed: 2340, enriched: 1890, started_at: new Date(), cost_estimate: "$100" },
    { id: "job_2", sector_id: "auto-dealers", type: "apollo", status: "queued", total: 10000, processed: 0, enriched: 0, started_at: new Date(), cost_estimate: "$1,000" },
    { id: "job_3", sector_id: "campgrounds-rv", type: "email_verify", status: "completed", total: 8200, processed: 8200, enriched: 7650, started_at: new Date(Date.now() - 3600000), completed_at: new Date(), cost_estimate: "$41" },
  ];
}

function generateMockWorkflows(): WorkspaceWorkflow[] {
  return [
    {
      id: "wf_1",
      name: "New Lead → Gianna SMS",
      workspace: "Hotel Outreach",
      trigger: "new_lead",
      actions: [
        { type: "enrich", config: { type: "skip_trace" } },
        { type: "sms", config: { template: "valuation_offer" } },
        { type: "wait", config: { hours: 24 } },
        { type: "sms", config: { template: "followup_1" } },
      ],
      enabled: true,
      leads_processed: 12500,
      conversions: 375,
    },
    {
      id: "wf_2",
      name: "Inbound Response → Email Capture",
      workspace: "Hotel Outreach",
      trigger: "response",
      actions: [
        { type: "tag", config: { tag: "responded" } },
        { type: "sms", config: { template: "email_capture" } },
        { type: "assign", config: { to: "calendar" } },
      ],
      enabled: true,
      leads_processed: 3200,
      conversions: 1850,
    },
    {
      id: "wf_3",
      name: "No Response → Requeue",
      workspace: "Auto Dealers",
      trigger: "no_response",
      actions: [
        { type: "wait", config: { days: 7 } },
        { type: "sms", config: { template: "soft_followup" } },
        { type: "tag", config: { tag: "requeued" } },
      ],
      enabled: true,
      leads_processed: 45000,
      conversions: 890,
    },
    {
      id: "wf_4",
      name: "Hot Signal → Priority Call",
      workspace: "RV Parks",
      trigger: "hot_signal",
      actions: [
        { type: "assign", config: { to: "calendar", priority: "high" } },
        { type: "call", config: { immediate: true } },
      ],
      enabled: false,
      leads_processed: 0,
      conversions: 0,
    },
  ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadManagerHub() {
  const [sectors, setSectors] = useState<DatalakeSector[]>([]);
  const [enrichmentJobs, setEnrichmentJobs] = useState<EnrichmentJob[]>([]);
  const [workflows, setWorkflows] = useState<WorkspaceWorkflow[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics>({
    total_datalake_records: 0,
    sectors_active: 0,
    pending_enrichment: 0,
    workflows_running: 0,
    leads_assigned_today: 0,
    response_rate: 0,
    avg_response_time: "0",
  });
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("datalake");
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize mock data
  useEffect(() => {
    const mockSectors = generateMockSectors();
    const mockJobs = generateMockJobs();
    const mockWorkflows = generateMockWorkflows();

    setSectors(mockSectors);
    setEnrichmentJobs(mockJobs);
    setWorkflows(mockWorkflows);

    // Calculate metrics
    setMetrics({
      total_datalake_records: mockSectors.reduce((sum, s) => sum + s.record_count, 0),
      sectors_active: mockSectors.filter(s => s.status === "active").length,
      pending_enrichment: mockJobs.filter(j => j.status === "queued" || j.status === "running").length,
      workflows_running: mockWorkflows.filter(w => w.enabled).length,
      leads_assigned_today: 2847,
      response_rate: 4.2,
      avg_response_time: "18m",
    });
  }, []);

  // Simulate job progress
  useEffect(() => {
    const interval = setInterval(() => {
      setEnrichmentJobs(prev => prev.map(job => {
        if (job.status === "running" && job.processed < job.total) {
          const increment = Math.floor(Math.random() * 50) + 10;
          const newProcessed = Math.min(job.processed + increment, job.total);
          const newEnriched = Math.floor(newProcessed * 0.81);
          return {
            ...job,
            processed: newProcessed,
            enriched: newEnriched,
            status: newProcessed >= job.total ? "completed" : "running",
            completed_at: newProcessed >= job.total ? new Date() : undefined,
          };
        }
        return job;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Launch enrichment job
  const launchEnrichment = (sectorId: string, type: EnrichmentJob["type"]) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;

    const unenriched = sector.record_count - sector.enriched_count;
    const batchSize = Math.min(unenriched, 5000);
    const costPerRecord = type === "apollo" ? 0.10 : type === "skip_trace" ? 0.02 : type === "email_verify" ? 0.005 : 0.01;
    const cost = `$${(batchSize * costPerRecord).toFixed(2)}`;

    const newJob: EnrichmentJob = {
      id: `job_${Date.now()}`,
      sector_id: sectorId,
      type,
      status: "running",
      total: batchSize,
      processed: 0,
      enriched: 0,
      started_at: new Date(),
      cost_estimate: cost,
    };

    setEnrichmentJobs(prev => [newJob, ...prev]);
    toast.success(`Started ${type} enrichment for ${sector.label} (${batchSize.toLocaleString()} records)`);
  };

  // Toggle workflow
  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id === workflowId) {
        const newEnabled = !wf.enabled;
        toast.info(`Workflow "${wf.name}" ${newEnabled ? "enabled" : "disabled"}`);
        return { ...wf, enabled: newEnabled };
      }
      return wf;
    }));
  };

  // Assign leads to Gianna
  const assignToGianna = (sectorId: string, count: number, type: "outreach" | "inbound") => {
    setIsProcessing(true);

    setTimeout(() => {
      toast.success(`Assigned ${count.toLocaleString()} leads from ${sectorId} to Gianna ${type === "outreach" ? "Outreach" : "Inbound Handler"}`);
      setIsProcessing(false);

      setMetrics(prev => ({
        ...prev,
        leads_assigned_today: prev.leads_assigned_today + count,
      }));
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Lead Manager Hub
              <Badge className="bg-emerald-600">Coordination Layer</Badge>
            </h2>
            <p className="text-zinc-400">
              Datalake → Enrichment → Workflows → Agent Assignment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300"
            onClick={() => toast.info("Syncing with datalake...")}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Settings className="h-4 w-4 mr-2" />
            Configure Hub
          </Button>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-7 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs">Datalake</span>
            </div>
            <p className="text-xl font-bold text-white">{(metrics.total_datalake_records / 1000000).toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Layers className="h-4 w-4" />
              <span className="text-xs">Sectors</span>
            </div>
            <p className="text-xl font-bold text-green-400">{metrics.sectors_active} active</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs">Enriching</span>
            </div>
            <p className="text-xl font-bold text-cyan-400">{metrics.pending_enrichment} jobs</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <GitBranch className="h-4 w-4" />
              <span className="text-xs">Workflows</span>
            </div>
            <p className="text-xl font-bold text-purple-400">{metrics.workflows_running} running</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Send className="h-4 w-4" />
              <span className="text-xs">Assigned Today</span>
            </div>
            <p className="text-xl font-bold text-blue-400">{metrics.leads_assigned_today.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">Response Rate</span>
            </div>
            <p className="text-xl font-bold text-green-400">{metrics.response_rate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Avg Response</span>
            </div>
            <p className="text-xl font-bold text-yellow-400">{metrics.avg_response_time}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="datalake" className="data-[state=active]:bg-emerald-600">
            <Database className="h-4 w-4 mr-2" />
            Datalake Sectors
          </TabsTrigger>
          <TabsTrigger value="enrichment" className="data-[state=active]:bg-cyan-600">
            <Sparkles className="h-4 w-4 mr-2" />
            Enrichment Queue
          </TabsTrigger>
          <TabsTrigger value="workflows" className="data-[state=active]:bg-purple-600">
            <GitBranch className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-green-600">
            <Send className="h-4 w-4 mr-2" />
            Lead Routing
          </TabsTrigger>
        </TabsList>

        {/* Datalake Sectors Tab */}
        <TabsContent value="datalake" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Managed Datalake Sectors
                </CardTitle>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sector
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sectors.map((sector) => {
                  const enrichmentRate = sector.record_count > 0
                    ? ((sector.enriched_count / sector.record_count) * 100).toFixed(1)
                    : "0";
                  const unenriched = sector.record_count - sector.enriched_count;

                  return (
                    <div
                      key={sector.id}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedSector === sector.id
                          ? "bg-emerald-600/20 border-emerald-500"
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${sector.color}`} />
                          <div>
                            <span className="font-medium text-white">{sector.label}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {sector.sic_codes.map(sic => (
                                <Badge key={sic} variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                                  SIC {sic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            sector.status === "active" ? "bg-green-600" :
                            sector.status === "paused" ? "bg-yellow-600" :
                            "bg-zinc-600"
                          }>
                            {sector.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-zinc-700"
                            onClick={() => setSelectedSector(selectedSector === sector.id ? null : sector.id)}
                          >
                            {selectedSector === sector.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-4 gap-4 mb-3">
                        <div>
                          <span className="text-xs text-zinc-500">Total Records</span>
                          <p className="text-lg font-semibold text-white">{sector.record_count.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500">Enriched</span>
                          <p className="text-lg font-semibold text-cyan-400">{sector.enriched_count.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500">Unenriched</span>
                          <p className="text-lg font-semibold text-yellow-400">{unenriched.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500">Last Upload</span>
                          <p className="text-sm text-zinc-300">
                            {sector.last_upload ? sector.last_upload.toLocaleDateString() : "Never"}
                          </p>
                        </div>
                      </div>

                      {/* Enrichment Progress */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Enrichment Coverage</span>
                          <span className="text-cyan-400">{enrichmentRate}%</span>
                        </div>
                        <Progress value={parseFloat(enrichmentRate)} className="h-2" />
                      </div>

                      {/* Expanded Actions */}
                      {selectedSector === sector.id && (
                        <div className="pt-3 border-t border-zinc-700 space-y-3">
                          {/* Enrichment Actions */}
                          <div>
                            <Label className="text-xs text-zinc-400 mb-2 block">Quick Enrich ({unenriched.toLocaleString()} unenriched)</Label>
                            <div className="flex gap-2">
                              {ENRICHMENT_TYPES.map(({ id, label, icon: Icon, cost }) => (
                                <Button
                                  key={id}
                                  variant="outline"
                                  size="sm"
                                  className="border-zinc-700 text-zinc-300 hover:bg-cyan-600/20 hover:border-cyan-500"
                                  onClick={() => launchEnrichment(sector.id, id as EnrichmentJob["type"])}
                                >
                                  <Icon className="h-3 w-3 mr-1" />
                                  {label}
                                  <span className="text-xs text-zinc-500 ml-1">({cost})</span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Assignment Actions */}
                          <div>
                            <Label className="text-xs text-zinc-400 mb-2 block">Assign to Gianna</Label>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-pink-600 hover:bg-pink-700"
                                onClick={() => assignToGianna(sector.id, Math.min(2000, unenriched), "outreach")}
                                disabled={isProcessing}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                2,000 → Outreach
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-400 hover:bg-green-600/20"
                                onClick={() => assignToGianna(sector.id, Math.min(500, sector.enriched_count), "inbound")}
                                disabled={isProcessing}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                500 → Inbound Queue
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-zinc-700"
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                Hot Leads → Calendar
                              </Button>
                            </div>
                          </div>

                          {/* Management Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400">
                              <Upload className="h-3 w-3 mr-2" />
                              Upload CSV
                            </Button>
                            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400">
                              <Download className="h-3 w-3 mr-2" />
                              Export
                            </Button>
                            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400">
                              <Edit className="h-3 w-3 mr-2" />
                              Edit Sector
                            </Button>
                            {sector.status === "active" ? (
                              <Button variant="outline" size="sm" className="border-yellow-600 text-yellow-400">
                                <Pause className="h-3 w-3 mr-2" />
                                Pause
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="border-green-600 text-green-400">
                                <Play className="h-3 w-3 mr-2" />
                                Activate
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrichment Queue Tab */}
        <TabsContent value="enrichment" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Enrichment Jobs
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                    {enrichmentJobs.filter(j => j.status === "running").length} running
                  </Badge>
                  <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                    {enrichmentJobs.filter(j => j.status === "queued").length} queued
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {enrichmentJobs.map((job) => {
                  const sector = sectors.find(s => s.id === job.sector_id);
                  const progress = job.total > 0 ? (job.processed / job.total) * 100 : 0;
                  const enrichmentRate = job.processed > 0 ? ((job.enriched / job.processed) * 100).toFixed(1) : "0";

                  return (
                    <div key={job.id} className="p-4 bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            job.status === "running" ? "bg-cyan-400 animate-pulse" :
                            job.status === "completed" ? "bg-green-400" :
                            job.status === "failed" ? "bg-red-400" :
                            "bg-yellow-400"
                          }`} />
                          <div>
                            <span className="font-medium text-white">{sector?.label || job.sector_id}</span>
                            <Badge className="ml-2 bg-zinc-700 text-zinc-300 text-xs">
                              {job.type.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">{job.cost_estimate}</span>
                          <Badge className={
                            job.status === "running" ? "bg-cyan-600" :
                            job.status === "completed" ? "bg-green-600" :
                            job.status === "failed" ? "bg-red-600" :
                            "bg-yellow-600"
                          }>
                            {job.status}
                          </Badge>
                        </div>
                      </div>

                      <Progress value={progress} className="h-2 mb-2" />

                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>{job.processed.toLocaleString()} / {job.total.toLocaleString()} processed</span>
                        <div className="flex gap-4">
                          <span className="text-cyan-400">{job.enriched.toLocaleString()} enriched ({enrichmentRate}%)</span>
                          {job.completed_at && (
                            <span className="text-green-400">Completed {job.completed_at.toLocaleTimeString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {enrichmentJobs.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No enrichment jobs running</p>
                    <p className="text-xs">Select a sector and start enriching</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Contextual Workflows
                </CardTitle>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflows.map((workflow) => {
                  const conversionRate = workflow.leads_processed > 0
                    ? ((workflow.conversions / workflow.leads_processed) * 100).toFixed(1)
                    : "0";
                  const trigger = WORKFLOW_TRIGGERS.find(t => t.id === workflow.trigger);
                  const TriggerIcon = trigger?.icon || CircleDot;

                  return (
                    <div key={workflow.id} className="p-4 bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${workflow.enabled ? "bg-purple-600/20" : "bg-zinc-700"}`}>
                            <TriggerIcon className={`h-4 w-4 ${workflow.enabled ? "text-purple-400" : "text-zinc-500"}`} />
                          </div>
                          <div>
                            <span className="font-medium text-white">{workflow.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                                {workflow.workspace}
                              </Badge>
                              <span className="text-xs text-zinc-500">
                                Trigger: {trigger?.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 ${workflow.enabled ? "border-green-600 text-green-400" : "border-zinc-700 text-zinc-500"}`}
                            onClick={() => toggleWorkflow(workflow.id)}
                          >
                            {workflow.enabled ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Disabled
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 border-zinc-700">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Workflow Actions Preview */}
                      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
                        {workflow.actions.map((action, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <Badge className="bg-zinc-700 text-zinc-300 text-xs shrink-0">
                              {action.type === "sms" && <MessageSquare className="h-3 w-3 mr-1" />}
                              {action.type === "email" && <Mail className="h-3 w-3 mr-1" />}
                              {action.type === "call" && <Phone className="h-3 w-3 mr-1" />}
                              {action.type === "enrich" && <Sparkles className="h-3 w-3 mr-1" />}
                              {action.type === "wait" && <Clock className="h-3 w-3 mr-1" />}
                              {action.type === "tag" && <Target className="h-3 w-3 mr-1" />}
                              {action.type === "assign" && <Send className="h-3 w-3 mr-1" />}
                              {action.type}
                            </Badge>
                            {idx < workflow.actions.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-zinc-600" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>{workflow.leads_processed.toLocaleString()} leads processed</span>
                        <span className="text-green-400">{workflow.conversions.toLocaleString()} conversions ({conversionRate}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Routing Tab */}
        <TabsContent value="assignments" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Gianna Outreach Queue */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-pink-400" />
                  Gianna Outreach Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <div>
                      <p className="text-2xl font-bold text-white">12,847</p>
                      <p className="text-xs text-zinc-500">Leads in queue</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-400">2,000/batch</p>
                      <p className="text-xs text-zinc-500">Omni campaign size</p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <p className="text-xs text-zinc-500 mb-2">Today's Execution</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-lg font-semibold text-white">8,500</p>
                        <p className="text-xs text-zinc-500">SMS Sent</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-blue-400">357</p>
                        <p className="text-xs text-zinc-500">Responses</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-green-400">4.2%</p>
                        <p className="text-xs text-zinc-500">Rate</p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-pink-600 hover:bg-pink-700">
                    <Play className="h-4 w-4 mr-2" />
                    Launch Next Batch (2,000)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gianna Inbound Handler */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-400" />
                  Gianna Inbound Handler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                    <div>
                      <p className="text-2xl font-bold text-white">357</p>
                      <p className="text-xs text-zinc-500">Pending responses</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-yellow-400">18m</p>
                      <p className="text-xs text-zinc-500">Avg response time</p>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <p className="text-xs text-zinc-500 mb-2">Response Categories</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Email Capture</span>
                        <Badge className="bg-green-600">142</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Interest Signal</span>
                        <Badge className="bg-blue-600">89</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Questions</span>
                        <Badge className="bg-yellow-600">76</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Not Interested</span>
                        <Badge className="bg-zinc-600">50</Badge>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full border-green-600 text-green-400 hover:bg-green-600/20">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View Conversation Queue
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Hot Leads */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-yellow-400" />
                  Calendar Hot Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">Today's Follow-ups</span>
                      <Badge className="bg-yellow-600">23</Badge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">This Week</span>
                      <Badge className="bg-zinc-600">89</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Overdue</span>
                      <Badge className="bg-red-600">12</Badge>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-600/20">
                    <Calendar className="h-4 w-4 mr-2" />
                    Open Calendar View
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Assignment */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-400" />
                  Campaign Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <p className="text-xs text-zinc-500 mb-2">Active Campaigns</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Hotel Outreach Q4</span>
                        <Badge className="bg-purple-600">4,200</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Auto Dealers Winter</span>
                        <Badge className="bg-purple-600">6,800</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">RV Parks 2025</span>
                        <Badge className="bg-purple-600">1,600</Badge>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/20">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
