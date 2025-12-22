"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Phone,
  Mail,
  Target,
  DollarSign,
  FileText,
  Zap,
  Clock,
  BarChart3,
  Webhook,
  RefreshCw,
  Filter,
  Calendar,
  ChevronDown,
  Flame,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * PIPELINE HEAT MAP - THE DEAL MACHINE VISIBILITY CENTER
 *
 * MIND MAP:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ THE COMPOUNDING DEAL MACHINE                                                 │
 * │                                                                              │
 * │ FLOW (Left to Right - Value Progression):                                   │
 * │                                                                              │
 * │ [INGESTION]    → [CAMPAIGN]      → [VALUE CONV]   → [PROPOSAL] → [DEAL]    │
 * │  Raw Data         Velocity           Velocity          Stage       Closed   │
 * │  - USBizData      - SMS sent         - Responses       - Sent      - Won    │
 * │  - CSVs           - Calls made       - Meetings        - Viewed    - Lost   │
 * │  - Webhooks       - Emails sent      - Demos           - Signed             │
 * │                                                                              │
 * │ HEAT INDICATORS:                                                             │
 * │ 🔥 Hot (Green)  = High activity, healthy conversion                         │
 * │ 🌡️ Warm (Yellow) = Moderate activity, watch closely                         │
 * │ ❄️ Cold (Red)   = Low activity, needs attention                             │
 * │                                                                              │
 * │ REPEATABLE PATTERN:                                                          │
 * │ • Same data structure every day                                              │
 * │ • Same metrics tracked                                                       │
 * │ • Same conversion benchmarks                                                 │
 * │ • Visible trends compound understanding                                      │
 * │                                                                              │
 * │ COMPOUNDING EFFECT:                                                          │
 * │ Week 1: Learn baseline                                                       │
 * │ Week 2: Identify bottlenecks                                                 │
 * │ Week 3: Optimize weak stages                                                 │
 * │ Week 4+: Compound improvements                                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// PIPELINE STAGE DEFINITIONS
// Correct flow: INGESTION → SKIP TRACING → CAMPAIGNS → INBOUND RESPONSES →
//               EMAIL CAPTURES → MOBILE CAPTURES → PROPOSALS → DEALS
// ============================================================================
interface PipelineStage {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  color: string;
  description: string;
  metrics: {
    label: string;
    value: number;
    previousValue: number;
    target: number;
    unit: string;
  }[];
  conversionToNext: number;
  previousConversion: number;
  heatLevel: "hot" | "warm" | "cold";
  bottleneckRisk: number; // 0-100
}

// ============================================================================
// HEAT LEVEL CALCULATION
// ============================================================================
function calculateHeatLevel(
  current: number,
  target: number,
): "hot" | "warm" | "cold" {
  const ratio = current / target;
  if (ratio >= 0.8) return "hot";
  if (ratio >= 0.5) return "warm";
  return "cold";
}

function getHeatColor(level: "hot" | "warm" | "cold"): string {
  switch (level) {
    case "hot":
      return "bg-green-500";
    case "warm":
      return "bg-yellow-500";
    case "cold":
      return "bg-red-500";
  }
}

function getHeatBgColor(level: "hot" | "warm" | "cold"): string {
  switch (level) {
    case "hot":
      return "bg-green-50 dark:bg-green-950/30 border-green-200";
    case "warm":
      return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200";
    case "cold":
      return "bg-red-50 dark:bg-red-950/30 border-red-200";
  }
}

// ============================================================================
// DEFAULT PIPELINE STAGES (Real data fetched on load)
// Flow: Ingestion → Skip Trace → Campaign → Inbound → Email → Mobile → Proposal → Deal
// ============================================================================
const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "ingestion",
    name: "Data Ingestion",
    shortName: "Ingestion",
    icon: Database,
    color: "text-blue-600",
    description: "USBizData CSV imports into the system",
    metrics: [
      { label: "Records Imported", value: 0, previousValue: 0, target: 2500, unit: "" },
      { label: "Lists Created", value: 0, previousValue: 0, target: 10, unit: "" },
      { label: "Ready for Skip Trace", value: 0, previousValue: 0, target: 2000, unit: "" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
  {
    id: "skip_trace",
    name: "Skip Tracing",
    shortName: "Skip Trace",
    icon: Target,
    color: "text-cyan-600",
    description: "Phone/email enrichment via RealEstateAPI",
    metrics: [
      { label: "Skip Traced", value: 0, previousValue: 0, target: 2000, unit: "" },
      { label: "Phones Found", value: 0, previousValue: 0, target: 1500, unit: "" },
      { label: "Emails Found", value: 0, previousValue: 0, target: 1200, unit: "" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
  {
    id: "campaign",
    name: "Campaigns",
    shortName: "Campaigns",
    icon: Zap,
    color: "text-purple-600",
    description: "SignalHouse SMS/Voice outreach execution",
    metrics: [
      { label: "SMS Sent", value: 0, previousValue: 0, target: 1000, unit: "" },
      { label: "Calls Made", value: 0, previousValue: 0, target: 400, unit: "" },
      { label: "Emails Sent", value: 0, previousValue: 0, target: 1500, unit: "" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
  {
    id: "inbound_response",
    name: "Inbound Responses",
    shortName: "Inbound",
    icon: MessageSquare,
    color: "text-green-600",
    description: "AI Copilot handling inbound messages",
    metrics: [
      { label: "SMS Responses", value: 0, previousValue: 0, target: 150, unit: "" },
      { label: "Call Backs", value: 0, previousValue: 0, target: 50, unit: "" },
      { label: "Voicemails", value: 0, previousValue: 0, target: 30, unit: "" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
  {
    id: "email_capture",
    name: "Email Captures",
    shortName: "Emails",
    icon: Mail,
    color: "text-amber-600",
    description: "Emails collected from responses",
    metrics: [
      { label: "Emails Captured", value: 0, previousValue: 0, target: 100, unit: "" },
      { label: "Verified", value: 0, previousValue: 0, target: 80, unit: "" },
      { label: "Opted In", value: 0, previousValue: 0, target: 60, unit: "" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
  {
    id: "mobile_capture",
    name: "Mobile Captures",
    shortName: "Mobiles",
    icon: Phone,
    color: "text-indigo-600",
    description: "Mobile numbers verified for SMS",
    metrics: [
      { label: "Mobiles Captured", value: 0, previousValue: 0, target: 120, unit: "" },
      { label: "SMS Capable", value: 0, previousValue: 0, target: 100, unit: "" },
      { label: "Opted In", value: 0, previousValue: 0, target: 80, unit: "" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
  {
    id: "proposal",
    name: "Proposals",
    shortName: "Proposals",
    icon: FileText,
    color: "text-orange-600",
    description: "Active deal negotiations",
    metrics: [
      { label: "Proposals Sent", value: 0, previousValue: 0, target: 25, unit: "" },
      { label: "Viewed", value: 0, previousValue: 0, target: 20, unit: "" },
      { label: "In Review", value: 0, previousValue: 0, target: 10, unit: "" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
  {
    id: "deal",
    name: "Deals Closed",
    shortName: "Deals",
    icon: DollarSign,
    color: "text-emerald-600",
    description: "Revenue generated",
    metrics: [
      { label: "Won", value: 0, previousValue: 0, target: 10, unit: "" },
      { label: "Revenue", value: 0, previousValue: 0, target: 100000, unit: "$" },
      { label: "Avg Deal Size", value: 0, previousValue: 0, target: 15000, unit: "$" },
    ],
    conversionToNext: 0,
    previousConversion: 0,
    heatLevel: "cold",
    bottleneckRisk: 0,
  },
];

// ============================================================================
// WEBHOOK ACTIVITY DATA
// ============================================================================
interface WebhookActivity {
  id: string;
  source: string;
  event: string;
  count: number;
  lastFired: string | null;
  status: "healthy" | "degraded" | "failing";
  avgLatency: number;
}

// Default placeholder data (shown while loading or on error)
const DEFAULT_WEBHOOK_ACTIVITIES: WebhookActivity[] = [
  {
    id: "wh-1",
    source: "SignalHouse",
    event: "sms.delivered",
    count: 0,
    lastFired: null,
    status: "failing",
    avgLatency: 45,
  },
  {
    id: "wh-2",
    source: "SignalHouse",
    event: "sms.response",
    count: 0,
    lastFired: null,
    status: "failing",
    avgLatency: 52,
  },
  {
    id: "wh-3",
    source: "Twilio",
    event: "call.completed",
    count: 0,
    lastFired: null,
    status: "failing",
    avgLatency: 38,
  },
  {
    id: "wh-4",
    source: "SendGrid",
    event: "email.opened",
    count: 0,
    lastFired: null,
    status: "failing",
    avgLatency: 120,
  },
  {
    id: "wh-5",
    source: "SendGrid",
    event: "email.clicked",
    count: 0,
    lastFired: null,
    status: "failing",
    avgLatency: 150,
  },
  {
    id: "wh-6",
    source: "Calendly",
    event: "meeting.scheduled",
    count: 0,
    lastFired: null,
    status: "failing",
    avgLatency: 95,
  },
  {
    id: "wh-7",
    source: "Stripe",
    event: "invoice.paid",
    count: 0,
    lastFired: null,
    status: "failing",
    avgLatency: 65,
  },
];

// ============================================================================
// HOURLY ACTIVITY HEATMAP DATA
// ============================================================================
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Generate mock heatmap data (activity intensity per hour per day)
function generateHeatmapData(): number[][] {
  return DAYS.map((day, dayIdx) =>
    HOURS.map((hour) => {
      // Simulate business hours having more activity
      if (hour >= 9 && hour <= 17 && dayIdx < 5) {
        return Math.floor(Math.random() * 80) + 20; // 20-100
      } else if (hour >= 8 && hour <= 19 && dayIdx < 5) {
        return Math.floor(Math.random() * 40) + 10; // 10-50
      } else {
        return Math.floor(Math.random() * 15); // 0-15
      }
    }),
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PipelineHeatmapPage() {
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(
    null,
  );
  const [heatmapData] = useState(() => generateHeatmapData());
  const [webhookActivities, setWebhookActivities] = useState<WebhookActivity[]>(
    DEFAULT_WEBHOOK_ACTIVITIES,
  );
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(true);

  // Fetch pipeline stats from database
  useEffect(() => {
    async function fetchPipelineStats() {
      try {
        setIsLoadingPipeline(true);
        const response = await fetch(`/api/analytics/pipeline-stats`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Merge fetched data with default stage definitions
            const updatedStages = DEFAULT_PIPELINE_STAGES.map((stage) => {
              const stageData = data.data.find((d: { id: string }) => d.id === stage.id);
              if (stageData) {
                // Calculate heat level based on first metric
                const firstMetric = stageData.metrics[0];
                const heatLevel = calculateHeatLevel(firstMetric.value, firstMetric.target);
                // Calculate bottleneck risk (inverse of conversion to next stage)
                const bottleneckRisk = stageData.conversionToNext > 0 
                  ? Math.max(0, 100 - stageData.conversionToNext)
                  : stage.id === "deal" ? 0 : 75;
                
                return {
                  ...stage,
                  metrics: stageData.metrics,
                  conversionToNext: stageData.conversionToNext,
                  previousConversion: stageData.previousConversion,
                  heatLevel,
                  bottleneckRisk,
                };
              }
              return stage;
            });
            setPipelineStages(updatedStages);
          }
        }
      } catch (error) {
        console.error("[Pipeline Heatmap] Failed to fetch pipeline stats:", error);
      } finally {
        setIsLoadingPipeline(false);
      }
    }
    fetchPipelineStats();
  }, [timeRange]);

  // Fetch webhook health data
  useEffect(() => {
    async function fetchWebhookHealth() {
      try {
        setIsLoadingWebhooks(true);
        const hoursMap: Record<string, number> = {
          "24h": 24,
          "7d": 168,
          "30d": 720,
          "90d": 2160,
        };
        const hours = hoursMap[timeRange] || 168;
        const response = await fetch(`/api/analytics/webhook-health?hours=${hours}`);
        if (response.ok) {
          const data = await response.json();
          if (data.webhooks && Array.isArray(data.webhooks)) {
            setWebhookActivities(data.webhooks);
          }
        }
      } catch (error) {
        console.error("[Pipeline Heatmap] Failed to fetch webhook health:", error);
      } finally {
        setIsLoadingWebhooks(false);
      }
    }
    fetchWebhookHealth();
  }, [timeRange]);

  // Calculate overall pipeline health
  const pipelineHealth = useMemo(() => {
    const avgConversion =
      pipelineStages.slice(0, -1).reduce(
        (sum, s) => sum + s.conversionToNext,
        0,
      ) /
      (pipelineStages.length - 1);
    const avgBottleneck =
      pipelineStages.reduce((sum, s) => sum + s.bottleneckRisk, 0) /
      pipelineStages.length;

    const dealStage = pipelineStages.find(s => s.id === "deal");
    return {
      overallHealth: 100 - avgBottleneck,
      avgConversion,
      totalDeals: dealStage?.metrics[0]?.value ?? 0,
      totalRevenue: dealStage?.metrics[1]?.value ?? 0,
      bottleneckStage: pipelineStages.reduce((max, s) =>
        s.bottleneckRisk > (max?.bottleneckRisk ?? 0) ? s : max,
      ),
    };
  }, [pipelineStages]);

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      {/* ================================================================== */}
      {/* HEADER: Deal Machine Visibility Center                            */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-7 w-7 text-orange-500" />
            Pipeline Heat Map
            <Badge variant="outline" className="ml-2">
              Deal Machine Visibility
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Full capacity utilization • Visible • Repeatable • Compounding
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* PIPELINE HEALTH SUMMARY                                           */}
      {/* ================================================================== */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="col-span-2 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Health</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {pipelineHealth.overallHealth.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Capacity utilization score
                </p>
              </div>
              <div className="h-16 w-16 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                <Activity className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Conversion</p>
            <p className="text-2xl font-bold">
              {pipelineHealth.avgConversion.toFixed(1)}%
            </p>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+2.3% vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Deals Closed</p>
            <p className="text-2xl font-bold">{pipelineHealth.totalDeals}</p>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+2 vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">
              ${(pipelineHealth.totalRevenue / 1000).toFixed(1)}K
            </p>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+36% vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* MAIN PIPELINE FLOW - The Deal Machine Stages                      */}
      {/* ================================================================== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Pipeline Flow
          </CardTitle>
          <CardDescription>
            From ingestion to deal - every stage visible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-stretch gap-2">
            {isLoadingPipeline ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading pipeline data...</span>
              </div>
            ) : (
            pipelineStages.map((stage, idx) => {
              const Icon = stage.icon;
              const isLast = idx === pipelineStages.length - 1;

              return (
                <React.Fragment key={stage.id}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all",
                            getHeatBgColor(stage.heatLevel),
                            selectedStage?.id === stage.id &&
                              "ring-2 ring-offset-2 ring-purple-500",
                          )}
                          onClick={() => setSelectedStage(stage)}
                        >
                          {/* Stage Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "p-2 rounded-lg bg-white shadow-sm",
                                  stage.color,
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {stage.shortName}
                                </p>
                                <div className="flex items-center gap-1">
                                  <div
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      getHeatColor(stage.heatLevel),
                                    )}
                                  />
                                  <span className="text-[10px] text-muted-foreground capitalize">
                                    {stage.heatLevel}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {stage.bottleneckRisk > 40 && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>

                          {/* Primary Metric */}
                          <div className="mb-2">
                            <p className="text-2xl font-bold">
                              {stage.metrics[0].unit}
                              {stage.metrics[0].value.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {stage.metrics[0].label}
                            </p>
                          </div>

                          {/* Conversion Rate */}
                          {!isLast && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  → Next
                                </span>
                                <span className="font-medium">
                                  {stage.conversionToNext}%
                                </span>
                              </div>
                              <Progress
                                value={stage.conversionToNext}
                                className="h-1 mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-medium">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stage.description}
                          </p>
                          {stage.metrics.map((m) => (
                            <div
                              key={m.label}
                              className="flex justify-between text-xs"
                            >
                              <span>{m.label}:</span>
                              <span className="font-medium">
                                {m.unit}
                                {m.value.toLocaleString()} / {m.unit}
                                {m.target.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Arrow between stages */}
                  {!isLast && (
                    <div className="flex items-center justify-center px-1">
                      <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                </React.Fragment>
              );
            })
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* TABS: Detailed Views                                               */}
      {/* ================================================================== */}
      <Tabs defaultValue="activity" className="flex-1">
        <TabsList>
          <TabsTrigger value="activity">
            <BarChart3 className="h-4 w-4 mr-2" />
            Activity Heatmap
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhook Health
          </TabsTrigger>
          <TabsTrigger value="bottlenecks">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Bottleneck Analysis
          </TabsTrigger>
        </TabsList>

        {/* ACTIVITY HEATMAP TAB */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Activity Heatmap</CardTitle>
              <CardDescription>
                When your team is most active - optimize capacity utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Hour labels */}
                <div className="flex">
                  <div className="w-12" />
                  {HOURS.filter((h) => h % 2 === 0).map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 text-center text-[10px] text-muted-foreground"
                    >
                      {hour === 0
                        ? "12a"
                        : hour < 12
                          ? `${hour}a`
                          : hour === 12
                            ? "12p"
                            : `${hour - 12}p`}
                    </div>
                  ))}
                </div>

                {/* Heatmap grid */}
                {DAYS.map((day, dayIdx) => (
                  <div key={day} className="flex items-center gap-1">
                    <div className="w-12 text-xs text-muted-foreground">
                      {day}
                    </div>
                    <div className="flex flex-1 gap-[2px]">
                      {HOURS.map((hour) => {
                        const intensity = heatmapData[dayIdx][hour];
                        const opacity = intensity / 100;

                        return (
                          <TooltipProvider key={hour}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "flex-1 h-6 rounded-sm transition-colors cursor-pointer hover:ring-1 hover:ring-purple-500",
                                    intensity > 60
                                      ? "bg-green-500"
                                      : intensity > 30
                                        ? "bg-yellow-500"
                                        : intensity > 10
                                          ? "bg-orange-300"
                                          : "bg-gray-200 dark:bg-gray-800",
                                  )}
                                  style={{ opacity: Math.max(0.3, opacity) }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {day} {hour}:00 - {intensity} activities
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded bg-gray-200" />
                    <div className="w-4 h-4 rounded bg-orange-300" />
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <div className="w-4 h-4 rounded bg-green-500" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOKS TAB */}
        <TabsContent value="webhooks" className="mt-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Webhook Health Monitor</CardTitle>
              <CardDescription>
                Repeatable, predictable data flow through integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWebhooks ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Loading webhook health...
                </div>
              ) : (
                <div className="space-y-3">
                  {webhookActivities.map((wh) => (
                    <div
                      key={wh.id}
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between transition-colors",
                        wh.status === "healthy" &&
                          "border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-400/30 dark:bg-emerald-400/5",
                        wh.status === "degraded" &&
                          "border-amber-500/50 bg-amber-500/10 dark:border-amber-400/30 dark:bg-amber-400/5",
                        wh.status === "failing" &&
                          "border-red-500/50 bg-red-500/10 dark:border-red-400/30 dark:bg-red-400/5",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            wh.status === "healthy" && "bg-emerald-500 dark:bg-emerald-400",
                            wh.status === "degraded" && "bg-amber-500 dark:bg-amber-400",
                            wh.status === "failing" && "bg-red-500 dark:bg-red-400",
                          )}
                        />
                        <div>
                          <p className="font-medium text-sm">{wh.source}</p>
                          <p className="text-xs text-muted-foreground">
                            {wh.event}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center min-w-[60px]">
                          <p className="font-semibold tabular-nums">
                            {wh.count.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Events
                          </p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className={cn(
                            "font-semibold tabular-nums",
                            wh.avgLatency > 500 && "text-amber-500 dark:text-amber-400",
                            wh.avgLatency > 1000 && "text-red-500 dark:text-red-400",
                          )}>
                            {wh.avgLatency}ms
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Latency
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize min-w-[80px] justify-center",
                            wh.status === "healthy" &&
                              "border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400",
                            wh.status === "degraded" &&
                              "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400",
                            wh.status === "failing" &&
                              "border-red-500 text-red-600 dark:border-red-400 dark:text-red-400",
                          )}
                        >
                          {wh.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOTTLENECK ANALYSIS TAB */}
        <TabsContent value="bottlenecks" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Bottleneck Risk by Stage
                </CardTitle>
                <CardDescription>
                  Where capacity is being wasted
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...pipelineStages].sort(
                  (a, b) => b.bottleneckRisk - a.bottleneckRisk,
                ).map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", stage.color)} />
                          <span className="text-sm font-medium">
                            {stage.name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            stage.bottleneckRisk > 50 && "text-red-600",
                            stage.bottleneckRisk > 30 &&
                              stage.bottleneckRisk <= 50 &&
                              "text-yellow-600",
                            stage.bottleneckRisk <= 30 && "text-green-600",
                          )}
                        >
                          {stage.bottleneckRisk}%
                        </span>
                      </div>
                      <Progress
                        value={stage.bottleneckRisk}
                        className={cn(
                          "h-2",
                          stage.bottleneckRisk > 50 && "[&>div]:bg-red-500",
                          stage.bottleneckRisk > 30 &&
                            stage.bottleneckRisk <= 50 &&
                            "[&>div]:bg-yellow-500",
                          stage.bottleneckRisk <= 30 && "[&>div]:bg-green-500",
                        )}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Optimization Suggestions
                </CardTitle>
                <CardDescription>
                  Actions to compound performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pipelineHealth.bottleneckStage && (
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">
                          {pipelineHealth.bottleneckStage.name} is the primary
                          bottleneck
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pipelineHealth.bottleneckStage.bottleneckRisk}% risk
                          - Consider increasing capacity here
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Ingestion is performing well
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        72% conversion to campaign-ready leads
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        Increase proposal velocity
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        18 proposals sent vs 25 target. Focus on closing value
                        conversations faster.
                      </p>
                    </div>
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
