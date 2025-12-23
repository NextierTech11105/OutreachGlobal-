"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Database,
  Play,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Filter,
  BarChart3,
  Zap,
  Calendar,
  Users,
  ArrowRight,
  Building2,
  Truck,
  Home,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamTitle } from "@/features/team/layouts/team-title";
import { useCurrentTeam } from "@/features/team/team.context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  USBIZDATA_REGISTRY,
  type USBizDataDatabase,
  getTotalRecordsAvailable,
  getVerifiedDatabases,
  getCategoryStats,
  getBusinessLineStats,
  getLuciDailyCapacity,
} from "@/lib/data/usbizdata-registry";

// Campaign bucket types
type CampaignContextBucket =
  | "initial"
  | "retarget"
  | "follow_up"
  | "book_appointment"
  | "nurture"
  | "nudger";

interface BucketConfig {
  id: CampaignContextBucket;
  name: string;
  worker: "gianna" | "cathy" | "sabrina";
  color: string;
  icon: React.ReactNode;
  maxLeads: number;
}

const CAMPAIGN_BUCKETS: BucketConfig[] = [
  { id: "initial", name: "Initial", worker: "gianna", color: "bg-purple-600", icon: <Zap className="h-4 w-4" />, maxLeads: 2000 },
  { id: "retarget", name: "Retarget", worker: "gianna", color: "bg-orange-600", icon: <RefreshCw className="h-4 w-4" />, maxLeads: 2000 },
  { id: "follow_up", name: "Follow Up", worker: "sabrina", color: "bg-blue-600", icon: <ArrowRight className="h-4 w-4" />, maxLeads: 2000 },
  { id: "book_appointment", name: "Book Appt", worker: "sabrina", color: "bg-green-600", icon: <Calendar className="h-4 w-4" />, maxLeads: 2000 },
  { id: "nurture", name: "Nurture", worker: "gianna", color: "bg-cyan-600", icon: <Users className="h-4 w-4" />, maxLeads: 2000 },
  { id: "nudger", name: "Nudger", worker: "cathy", color: "bg-pink-600", icon: <Sparkles className="h-4 w-4" />, maxLeads: 2000 },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  blue_collar: <Building2 className="h-4 w-4" />,
  real_estate: <Home className="h-4 w-4" />,
  healthcare: <Stethoscope className="h-4 w-4" />,
  hospitality: <Building2 className="h-4 w-4" />,
  food_service: <Building2 className="h-4 w-4" />,
  professional: <Building2 className="h-4 w-4" />,
  financial: <Building2 className="h-4 w-4" />,
  education: <Building2 className="h-4 w-4" />,
  technology: <Building2 className="h-4 w-4" />,
  retail: <Building2 className="h-4 w-4" />,
  other: <Building2 className="h-4 w-4" />,
};

export default function LuciDataDashboardPage() {
  const { team } = useCurrentTeam();
  const [activeTab, setActiveTab] = useState<"registry" | "buckets" | "jobs">("registry");
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [bucketStats, setBucketStats] = useState<Record<CampaignContextBucket, number>>({
    initial: 0,
    retarget: 0,
    follow_up: 0,
    book_appointment: 0,
    nurture: 0,
    nudger: 0,
  });
  const [pipelineStats, setPipelineStats] = useState({
    totalLeads: 0,
    skipTraced: 0,
    readyForCampaign: 0,
  });

  // Get stats from registry
  const totalRecords = getTotalRecordsAvailable();
  const verifiedDbs = getVerifiedDatabases();
  const categoryStats = getCategoryStats();
  const businessLineStats = getBusinessLineStats();
  const capacity = getLuciDailyCapacity();

  // Fetch pipeline data
  const fetchPipelineData = useCallback(async () => {
    try {
      const response = await fetch("/api/luci/pipeline");
      if (response.ok) {
        const data = await response.json();
        if (data.dataLake) {
          setPipelineStats({
            totalLeads: data.dataLake.businesses || 0,
            skipTraced: data.dataLake.skipTraced || 0,
            readyForCampaign: data.dataLake.enriched || 0,
          });
        }
        // Set bucket stats if available
        if (data.buckets) {
          setBucketStats(data.buckets);
        }
      }
    } catch (error) {
      console.error("Failed to fetch pipeline data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  // Run scan
  const runScan = async () => {
    setIsScanning(true);
    setScanProgress(0);

    try {
      const response = await fetch("/api/luci/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          limit: capacity.leadBlockSize,
          scanMode: "priority",
        }),
      });

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 200));
        setScanProgress(i);
      }

      if (response.ok) {
        const data = await response.json();
        toast.success(`Scanned ${data.totalScanned?.toLocaleString() || 0} records`);
        fetchPipelineData();
      } else {
        toast.error("Scan failed");
      }
    } catch (error) {
      toast.error("Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const totalBucketLeads = Object.values(bucketStats).reduce((a, b) => a + b, 0);
  const poolFillPercent = (totalBucketLeads / capacity.poolTarget) * 100;

  return (
    <TeamSection className="h-full flex flex-col">
      <TeamHeader>
        <div className="flex items-center justify-between w-full">
          <TeamTitle>
            <Brain className="w-6 h-6 mr-2" />
            LUCI Data Engine
          </TeamTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={runScan}
              disabled={isScanning}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning... {scanProgress}%
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Scan
                </>
              )}
            </Button>
            <Button variant="outline" onClick={fetchPipelineData}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </TeamHeader>

      <div className="flex-1 p-4 space-y-4 min-h-0 overflow-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Database className="w-3 h-3" />
                Total Records
              </div>
              <p className="text-xl font-bold text-zinc-100">
                {totalRecords.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">{USBIZDATA_REGISTRY.length} databases</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <CheckCircle2 className="w-3 h-3" />
                Skip Traced
              </div>
              <p className="text-xl font-bold text-green-400">
                {pipelineStats.skipTraced.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">{capacity.skipTraceBatchSize}/batch</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <Zap className="w-3 h-3" />
                Ready for Campaign
              </div>
              <p className="text-xl font-bold text-purple-400">
                {pipelineStats.readyForCampaign.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">{capacity.leadBlockSize}/day max</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                <BarChart3 className="w-3 h-3" />
                Monthly Pool
              </div>
              <p className="text-xl font-bold text-blue-400">
                {totalBucketLeads.toLocaleString()} / {capacity.poolTarget.toLocaleString()}
              </p>
              <Progress value={poolFillPercent} className="h-1 mt-1" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="registry">Database Registry</TabsTrigger>
            <TabsTrigger value="buckets">Campaign Buckets</TabsTrigger>
            <TabsTrigger value="jobs">Scan Jobs</TabsTrigger>
          </TabsList>

          {/* Database Registry Tab */}
          <TabsContent value="registry" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  USBizData Registry
                  <Badge variant="outline" className="ml-2">
                    {USBIZDATA_REGISTRY.length} databases
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {verifiedDbs.length} verified databases with {totalRecords.toLocaleString()} total records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Database</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Business Line</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {USBIZDATA_REGISTRY.map((db) => (
                      <TableRow key={db.id} className="border-zinc-800">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {CATEGORY_ICONS[db.category] || <Building2 className="h-4 w-4 text-zinc-500" />}
                            <div>
                              <p className="font-medium">{db.name}</p>
                              <p className="text-xs text-zinc-500">SIC: {db.sicCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">{db.totalRecords.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          {db.verified ? (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/50">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-zinc-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Estimated
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 capitalize">
                            {db.category.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              db.businessLine === "nextier" && "border-purple-500/50 text-purple-400",
                              db.businessLine === "ecbb" && "border-blue-500/50 text-blue-400",
                              db.businessLine === "outreach_global" && "border-green-500/50 text-green-400",
                              db.businessLine === "all" && "border-zinc-500/50 text-zinc-400"
                            )}
                          >
                            {db.businessLine || "all"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaign Buckets Tab */}
          <TabsContent value="buckets" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CAMPAIGN_BUCKETS.map((bucket) => {
                const count = bucketStats[bucket.id] || 0;
                const fillPercent = (count / bucket.maxLeads) * 100;

                return (
                  <Card key={bucket.id} className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className={cn("p-2 rounded-lg", bucket.color)}>
                          {bucket.icon}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {bucket.worker}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{bucket.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Leads</span>
                          <span className="font-mono">
                            {count.toLocaleString()} / {bucket.maxLeads.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={fillPercent} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Scan Jobs Tab */}
          <TabsContent value="jobs" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-zinc-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Scan history will appear here after running scans</p>
                  <Button
                    onClick={runScan}
                    disabled={isScanning}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run First Scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeamSection>
  );
}
