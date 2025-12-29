"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  UserSearch,
  Send,
  Target,
  TrendingUp,
  Users,
  Sparkles,
  Bot,
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Loader2,
  Zap,
  MessageSquare,
  Phone,
  Calendar,
  ArrowRight,
  Tag,
  Building2,
  ChevronRight,
  Radio,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InboxResponseHeatmap } from "@/components/inbox-response-heatmap";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// Pipeline targets
const DAILY_SKIP_TRACE_LIMIT = 2000;
const BATCH_SIZE = 250;
const CAMPAIGN_BUCKET_SIZE = 2000;
const MONTHLY_POOL_TARGET = 20000;

// AI Worker personas
const AI_WORKERS = [
  {
    id: "gianna",
    name: "GIANNA",
    role: "Opener",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    campaigns: ["Initial", "Retarget", "Nurture"],
  },
  {
    id: "sabrina",
    name: "SABRINA",
    role: "Closer",
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    campaigns: ["Follow Up", "Book Appt"],
  },
  {
    id: "cathy",
    name: "CATHY",
    role: "Nudger",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    campaigns: ["Nudger"],
  },
];

// Brand Campaign Structure mapped to SignalHouse
// Brand = registered 10DLC brand with carriers
// Sub-Brand = campaign types under the brand
interface BrandCampaign {
  id: string;
  brandName: string;
  brandId: string; // SignalHouse brand registration ID
  status: "pending" | "approved" | "rejected";
  registeredAt?: string;
  subCampaigns: SubCampaign[];
}

interface SubCampaign {
  id: string;
  name: string;
  type: "initial" | "retarget" | "nurture" | "followup" | "nudge";
  assignedWorker: string; // gianna, sabrina, cathy
  messageTemplateId?: string;
  status: "draft" | "active" | "paused";
  stats: {
    sent: number;
    delivered: number;
    responses: number;
    positive: number;
  };
}

interface PipelineStats {
  totalRecords: number;
  totalDatabases: number;
  skipTracedToday: number;
  skipTracedTotal: number;
  readyForCampaign: number;
  monthlyPool: number;
  campaignBuckets: {
    [key: string]: {
      worker: string;
      campaign: string;
      leads: number;
      sent: number;
      responses: number;
    };
  };
}

interface DataLake {
  id: string;
  name: string;
  totalLeads: number;
  enrichedLeads: number;
  source: string;
}

export default function CommandCenterPage() {
  const params = useParams();
  const teamId = params.team as string;
  const [stats, setStats] = useState<PipelineStats>({
    totalRecords: 0,
    totalDatabases: 0,
    skipTracedToday: 0,
    skipTracedTotal: 0,
    readyForCampaign: 0,
    monthlyPool: 0,
    campaignBuckets: {},
  });
  const [dataLakes, setDataLakes] = useState<DataLake[]>([]);
  const [brandCampaigns, setBrandCampaigns] = useState<BrandCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSkipTracing, setIsSkipTracing] = useState(false);
  const [luciActive, setLuciActive] = useState(false);

  // Fetch pipeline stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch data lakes
      const bucketsRes = await fetch("/api/buckets?perPage=100");
      const bucketsData = await bucketsRes.json();

      if (bucketsData.buckets) {
        setDataLakes(bucketsData.buckets);

        // Calculate stats from buckets
        const totalRecords = bucketsData.buckets.reduce(
          (acc: number, b: DataLake) => acc + (b.totalLeads || 0),
          0,
        );
        const totalEnriched = bucketsData.buckets.reduce(
          (acc: number, b: DataLake) => acc + (b.enrichedLeads || 0),
          0,
        );

        setStats((prev) => ({
          ...prev,
          totalRecords,
          totalDatabases: bucketsData.buckets.length,
          skipTracedTotal: totalEnriched,
          readyForCampaign: Math.min(totalEnriched, CAMPAIGN_BUCKET_SIZE),
          monthlyPool: totalEnriched,
        }));
      }

      // Fetch skip trace usage
      const usageRes = await fetch("/api/enrichment/usbiz-skip-trace");
      const usageData = await usageRes.json();
      if (usageData.usage) {
        setStats((prev) => ({
          ...prev,
          skipTracedToday: usageData.usage.today || 0,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start batch skip trace
  const handleBatchSkipTrace = async () => {
    if (stats.skipTracedToday >= DAILY_SKIP_TRACE_LIMIT) {
      toast.error("Daily skip trace limit reached");
      return;
    }

    // Find a data lake with unenriched records
    const targetLake = dataLakes.find(
      (lake) => lake.totalLeads > lake.enrichedLeads,
    );

    if (!targetLake) {
      toast.error("No records available for skip tracing");
      return;
    }

    setIsSkipTracing(true);
    try {
      const response = await fetch(`/api/buckets/${targetLake.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxRecords: BATCH_SIZE,
          enrichType: "skip_trace",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `Skip traced ${data.results.enriched} records from ${targetLake.name}`,
        );
        fetchStats(); // Refresh stats
      } else {
        toast.error(data.error || "Skip trace failed");
      }
    } catch (error) {
      toast.error("Skip trace failed");
    } finally {
      setIsSkipTracing(false);
    }
  };

  // Toggle LUCI autopilot
  const toggleLuci = () => {
    setLuciActive(!luciActive);
    if (!luciActive) {
      toast.success("LUCI activated - will pull leads until 20K reached");
    } else {
      toast.info("LUCI paused");
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Campaign bucket component
  const CampaignBucket = ({
    worker,
    campaign,
    leads,
    target,
  }: {
    worker: (typeof AI_WORKERS)[0];
    campaign: string;
    leads: number;
    target: number;
  }) => {
    const progress = (leads / target) * 100;
    const isReady = leads >= target;

    return (
      <Card className={cn("transition-all", isReady && "border-green-500/50")}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded", worker.bgColor)}>
                <Bot className={cn("h-4 w-4", worker.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{worker.name}</p>
                <p className="font-medium text-sm">{campaign}</p>
              </div>
            </div>
            {isReady ? (
              <Badge className="bg-green-600">Ready</Badge>
            ) : (
              <Badge variant="outline">{Math.round(progress)}%</Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Leads</span>
              <span>
                {formatNumber(leads)} / {formatNumber(target)}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              Lead Pipeline Command Center
            </h2>
            <p className="text-muted-foreground mt-1">
              USBizData → Skip Trace → Campaign Ready → 20K/month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/t/${teamId}/onboarding`}>
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Rocket className="h-4 w-4 mr-2" />
                Build Your Machine
              </Button>
            </Link>
            <Link href={`/t/${teamId}/skip-trace`}>
              <Button variant="outline" size="sm">
                <UserSearch className="h-4 w-4 mr-2" />
                Skip Trace
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant={luciActive ? "destructive" : "default"}
              size="sm"
              onClick={toggleLuci}
              className={cn(!luciActive && "bg-purple-600 hover:bg-purple-700")}
            >
              {luciActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause LUCI
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Activate LUCI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                Total Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.totalRecords)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalDatabases} databases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserSearch className="h-4 w-4 text-purple-500" />
                Skip Traced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.skipTracedTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                {BATCH_SIZE}/batch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Today's Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(stats.skipTracedToday)}
              </div>
              <p className="text-xs text-muted-foreground">
                / {formatNumber(DAILY_SKIP_TRACE_LIMIT)} daily max
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                Ready for Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(stats.readyForCampaign)}
              </div>
              <p className="text-xs text-muted-foreground">
                / {formatNumber(CAMPAIGN_BUCKET_SIZE)} target
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-pink-500" />
                Monthly Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">
                  {formatNumber(stats.monthlyPool)}
                </div>
                <div className="flex-1">
                  <Progress
                    value={(stats.monthlyPool / MONTHLY_POOL_TARGET) * 100}
                    className="h-3"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  / {formatNumber(MONTHLY_POOL_TARGET)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="registry" className="space-y-4">
          <TabsList>
            <TabsTrigger value="registry">Database Registry</TabsTrigger>
            <TabsTrigger value="brands">Brand Campaigns</TabsTrigger>
            <TabsTrigger value="buckets">AI Buckets</TabsTrigger>
            <TabsTrigger value="activity">Response Activity</TabsTrigger>
            <TabsTrigger value="scan">LUCI</TabsTrigger>
          </TabsList>

          {/* Database Registry */}
          <TabsContent value="registry" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">USBizData Sources</h3>
              <Button
                onClick={handleBatchSkipTrace}
                disabled={
                  isSkipTracing ||
                  stats.skipTracedToday >= DAILY_SKIP_TRACE_LIMIT
                }
              >
                {isSkipTracing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Skip Tracing...
                  </>
                ) : (
                  <>
                    <UserSearch className="h-4 w-4 mr-2" />
                    Skip Trace Batch ({BATCH_SIZE})
                  </>
                )}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : dataLakes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Rocket className="h-12 w-12 text-purple-500 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    Ready to Build Your Machine?
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Upload your leads CSV and launch your outreach machine in under 2 minutes.
                  </p>
                  <Link href={`/t/${teamId}/onboarding`}>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <Rocket className="h-4 w-4 mr-2" />
                      Build Your Machine
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataLakes.map((lake) => {
                  const unenriched = lake.totalLeads - lake.enrichedLeads;
                  const progress =
                    (lake.enrichedLeads / lake.totalLeads) * 100 || 0;

                  return (
                    <Card key={lake.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{lake.name}</CardTitle>
                          <Badge variant="outline">
                            {formatNumber(lake.totalLeads)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Skip Traced
                            </span>
                            <span>
                              {formatNumber(lake.enrichedLeads)} /{" "}
                              {formatNumber(lake.totalLeads)}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          {unenriched > 0 && (
                            <p className="text-xs text-amber-600">
                              {formatNumber(unenriched)} remaining
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Brand Campaigns - SignalHouse Infrastructure */}
          <TabsContent value="brands" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Brand & Sub-Brand Campaigns
                </h3>
                <p className="text-sm text-muted-foreground">
                  10DLC registered brands mapped to SignalHouse infrastructure
                </p>
              </div>
              <Button size="sm">
                <Radio className="h-4 w-4 mr-2" />
                Register New Brand
              </Button>
            </div>

            {brandCampaigns.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    No Brand Campaigns Yet
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Register a 10DLC brand with SignalHouse to start sending SMS
                    campaigns.
                  </p>
                </CardContent>
              </Card>
            ) : (
              brandCampaigns.map((brand) => (
                <Card key={brand.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {brand.brandName}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {brand.brandId}
                            </span>
                            <Badge
                              variant={
                                brand.status === "approved"
                                  ? "default"
                                  : "secondary"
                              }
                              className={cn(
                                brand.status === "approved" && "bg-green-600",
                              )}
                            >
                              {brand.status}
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{brand.subCampaigns.length} sub-campaigns</p>
                        <p>
                          {brand.subCampaigns
                            .reduce((a, c) => a + c.stats.sent, 0)
                            .toLocaleString()}{" "}
                          messages sent
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {brand.subCampaigns.map((sub) => {
                        const worker = AI_WORKERS.find(
                          (w) => w.id === sub.assignedWorker,
                        );
                        const deliveryRate = (
                          (sub.stats.delivered / sub.stats.sent) *
                          100
                        ).toFixed(1);
                        const responseRate = (
                          (sub.stats.responses / sub.stats.delivered) *
                          100
                        ).toFixed(1);
                        const positiveRate = (
                          (sub.stats.positive / sub.stats.responses) *
                          100
                        ).toFixed(1);

                        return (
                          <div
                            key={sub.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{sub.name}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    sub.status === "active" &&
                                      "border-green-500 text-green-600",
                                    sub.status === "paused" &&
                                      "border-amber-500 text-amber-600",
                                    sub.status === "draft" &&
                                      "border-gray-500 text-gray-600",
                                  )}
                                >
                                  {sub.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                <span className="capitalize">{sub.type}</span>
                                {worker && (
                                  <span
                                    className={cn(
                                      "flex items-center gap-1",
                                      worker.color,
                                    )}
                                  >
                                    <Bot className="h-3 w-3" />
                                    {worker.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-center text-xs">
                              <div>
                                <p className="font-medium">
                                  {sub.stats.sent.toLocaleString()}
                                </p>
                                <p className="text-muted-foreground">Sent</p>
                              </div>
                              <div>
                                <p className="font-medium text-blue-600">
                                  {deliveryRate}%
                                </p>
                                <p className="text-muted-foreground">
                                  Delivered
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-purple-600">
                                  {responseRate}%
                                </p>
                                <p className="text-muted-foreground">
                                  Response
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-green-600">
                                  {positiveRate}%
                                </p>
                                <p className="text-muted-foreground">
                                  Positive
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* SignalHouse Integration Info */}
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                    <Radio className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      SignalHouse Infrastructure
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Brand campaigns are automatically synced with SignalHouse
                      10DLC registration. Sub-campaigns inherit throughput
                      limits from the parent brand.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaign Buckets */}
          <TabsContent value="buckets" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                AI Worker Campaign Buckets
              </h3>
              <p className="text-sm text-muted-foreground">
                Each bucket holds {formatNumber(CAMPAIGN_BUCKET_SIZE)} leads
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AI_WORKERS.flatMap((worker) =>
                worker.campaigns.map((campaign) => (
                  <CampaignBucket
                    key={`${worker.id}-${campaign}`}
                    worker={worker}
                    campaign={campaign}
                    leads={
                      stats.campaignBuckets[`${worker.id}-${campaign}`]
                        ?.leads || 0
                    }
                    target={CAMPAIGN_BUCKET_SIZE}
                  />
                )),
              )}
            </div>

            {/* AI Worker Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AI Workers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {AI_WORKERS.map((worker) => (
                    <div key={worker.id} className="flex items-center gap-2">
                      <div className={cn("p-2 rounded", worker.bgColor)}>
                        <Bot className={cn("h-4 w-4", worker.color)} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{worker.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {worker.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Response Activity - Inbox Heatmap */}
          <TabsContent value="activity" className="space-y-4">
            <InboxResponseHeatmap />
          </TabsContent>

          {/* LUCI Copilot */}
          <TabsContent value="scan" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  LUCI Copilot
                </CardTitle>
                <CardDescription>
                  AI-powered lead pulling until 20,000 skip traced leads
                  accumulated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-3 rounded-full",
                        luciActive
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-muted-foreground/20",
                      )}
                    >
                      <Bot
                        className={cn(
                          "h-6 w-6",
                          luciActive
                            ? "text-green-600"
                            : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium">LUCI Status</p>
                      <p className="text-sm text-muted-foreground">
                        {luciActive
                          ? "Actively pulling leads"
                          : "Waiting for activation"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={luciActive ? "destructive" : "default"}
                    onClick={toggleLuci}
                  >
                    {luciActive ? "Pause" : "Activate"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-2xl font-bold">
                      {formatNumber(stats.monthlyPool)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Leads Pulled
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-2xl font-bold">
                      {formatNumber(MONTHLY_POOL_TARGET - stats.monthlyPool)}
                    </p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (stats.monthlyPool / MONTHLY_POOL_TARGET) * 100,
                      )}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground">Progress</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-2xl font-bold">
                      {Math.ceil(
                        (MONTHLY_POOL_TARGET - stats.monthlyPool) /
                          DAILY_SKIP_TRACE_LIMIT,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Days to Goal
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
