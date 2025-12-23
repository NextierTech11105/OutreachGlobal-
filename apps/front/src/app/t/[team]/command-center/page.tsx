"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
          0
        );
        const totalEnriched = bucketsData.buckets.reduce(
          (acc: number, b: DataLake) => acc + (b.enrichedLeads || 0),
          0
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
      (lake) => lake.totalLeads > lake.enrichedLeads
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
          `Skip traced ${data.results.enriched} records from ${targetLake.name}`
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
            <TabsTrigger value="buckets">Campaign Buckets</TabsTrigger>
            <TabsTrigger value="scan">Scan Jobs</TabsTrigger>
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
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    No Databases Yet
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Upload USBizData CSV exports in Sectors to start building
                    your lead pipeline.
                  </p>
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

          {/* Campaign Buckets */}
          <TabsContent value="buckets" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Worker Campaign Buckets</h3>
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
                    leads={stats.campaignBuckets[`${worker.id}-${campaign}`]?.leads || 0}
                    target={CAMPAIGN_BUCKET_SIZE}
                  />
                ))
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

          {/* Scan Jobs */}
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
                          : "bg-muted-foreground/20"
                      )}
                    >
                      <Bot
                        className={cn(
                          "h-6 w-6",
                          luciActive
                            ? "text-green-600"
                            : "text-muted-foreground"
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
                        (stats.monthlyPool / MONTHLY_POOL_TARGET) * 100
                      )}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground">Progress</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-2xl font-bold">
                      {Math.ceil(
                        (MONTHLY_POOL_TARGET - stats.monthlyPool) /
                          DAILY_SKIP_TRACE_LIMIT
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Days to Goal</p>
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
