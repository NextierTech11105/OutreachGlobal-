"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Ban,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Search,
  Eye,
  Bot,
  User,
  Calendar,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

// Types from API
interface MetricsSummary {
  totalOutbound: number;
  delivered: number;
  deliveryRate: number;
  failed: number;
  failureRate: number;
  totalInbound: number;
  responseRate: number;
  optedOut: number;
  blacklistCount: number;
}

interface ClassificationBreakdown {
  classification: string;
  count: number;
  percentage: number;
}

interface WorkerStats {
  worker: string;
  sent: number;
  delivered: number;
  responses: number;
  responseRate: number;
}

interface CampaignStats {
  campaignId: string;
  campaignName: string;
  sent: number;
  delivered: number;
  responses: number;
  optOuts: number;
  responseRate: number;
}

interface DailyTrend {
  date: string;
  outbound: number;
  inbound: number;
  delivered: number;
  failed: number;
}

interface RecentMessage {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  body: string;
  direction: "inbound" | "outbound";
  status: string;
  classification?: string;
  worker?: string;
  createdAt: string;
}

interface AnalyticsData {
  summary: MetricsSummary;
  classifications: ClassificationBreakdown[];
  workerStats: WorkerStats[];
  campaignStats: CampaignStats[];
  dailyTrends: DailyTrend[];
  recentMessages: RecentMessage[];
  dateRange: {
    from: string;
    to: string;
  };
}

interface SMSAnalyticsDashboardProps {
  teamId: string;
}

// Classification colors
const CLASSIFICATION_COLORS: Record<string, string> = {
  OPT_OUT: "#ef4444",
  NOT_INTERESTED: "#f97316",
  WRONG_NUMBER: "#f59e0b",
  POSITIVE: "#22c55e",
  EMAIL_CAPTURE: "#3b82f6",
  MOBILE_CAPTURE: "#8b5cf6",
  QUESTION: "#06b6d4",
  UNCLASSIFIED: "#6b7280",
  OTHER: "#a1a1aa",
};

// Worker colors
const WORKER_COLORS: Record<string, string> = {
  gianna: "#ec4899",
  cathy: "#8b5cf6",
  sabrina: "#06b6d4",
  manual: "#6b7280",
};

// Status badge variants
function getStatusBadge(status: string) {
  const variants: Record<string, { className: string; label: string }> = {
    delivered: {
      className: "bg-green-500/10 text-green-500",
      label: "Delivered",
    },
    sent: { className: "bg-blue-500/10 text-blue-500", label: "Sent" },
    failed: { className: "bg-red-500/10 text-red-500", label: "Failed" },
    received: {
      className: "bg-purple-500/10 text-purple-500",
      label: "Received",
    },
    pending: {
      className: "bg-yellow-500/10 text-yellow-500",
      label: "Pending",
    },
  };
  const variant = variants[status.toLowerCase()] || {
    className: "bg-gray-500/10 text-gray-500",
    label: status,
  };
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

// Classification badge
function getClassificationBadge(classification?: string) {
  if (!classification) return null;
  const color = CLASSIFICATION_COLORS[classification] || "#6b7280";
  return (
    <Badge
      style={{ backgroundColor: `${color}20`, color }}
      className="font-medium"
    >
      {classification.replace(/_/g, " ")}
    </Badge>
  );
}

export function SMSAnalyticsDashboard({ teamId }: SMSAnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        teamId,
        days: timeRange,
      });
      if (selectedWorker !== "all") {
        params.set("worker", selectedWorker);
      }
      if (selectedCampaign !== "all") {
        params.set("campaignId", selectedCampaign);
      }

      const response = await fetch(`/api/sms/analytics?${params}`);
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load analytics");
      }
    } catch (err) {
      setError("Failed to fetch analytics data");
      console.error("[SMS Analytics] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId, timeRange, selectedWorker, selectedCampaign]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Filter recent messages by search
  const filteredMessages = data?.recentMessages.filter(
    (msg) =>
      msg.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.phone.includes(searchQuery) ||
      msg.body.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Export to CSV
  const exportToCSV = () => {
    if (!data?.recentMessages) return;
    const headers = ["Date", "Name", "Phone", "Direction", "Status", "Message"];
    const rows = data.recentMessages.map((msg) => [
      format(new Date(msg.createdAt), "yyyy-MM-dd HH:mm"),
      msg.leadName,
      msg.phone,
      msg.direction,
      msg.status,
      `"${msg.body.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sms-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summary = data?.summary || {
    totalOutbound: 0,
    delivered: 0,
    deliveryRate: 0,
    failed: 0,
    failureRate: 0,
    totalInbound: 0,
    responseRate: 0,
    optedOut: 0,
    blacklistCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedWorker} onValueChange={setSelectedWorker}>
            <SelectTrigger className="w-[140px]">
              <Bot className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workers</SelectItem>
              <SelectItem value="gianna">GIANNA</SelectItem>
              <SelectItem value="cathy">CATHY</SelectItem>
              <SelectItem value="sabrina">SABRINA</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards - Easify Style Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Send className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total SMS</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {summary.totalOutbound.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-xs text-muted-foreground">Delivered</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {summary.delivered.toLocaleString()}
              </div>
              <div className="text-xs text-green-500">
                {summary.deliveryRate.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Success</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {(summary.totalOutbound - summary.failed).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-muted-foreground">Undelivered</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {(summary.totalOutbound - summary.delivered).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-muted-foreground">Received</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {summary.totalInbound.toLocaleString()}
              </div>
              <div className="text-xs text-purple-500">
                {summary.responseRate.toFixed(1)}% rate
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-xs text-muted-foreground">Failed</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {summary.failed.toLocaleString()}
              </div>
              <div className="text-xs text-red-500">
                {summary.failureRate.toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Ban className="w-5 h-5 text-gray-500" />
              <span className="text-xs text-muted-foreground">Blacklist</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {summary.blacklistCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {summary.optedOut} opted out
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="classifications">Classifications</TabsTrigger>
          <TabsTrigger value="workers">AI Workers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Charts */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Message Volume</CardTitle>
                <CardDescription>
                  Daily outbound vs inbound messages
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.dailyTrends || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(new Date(date), "MMM d")}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(date) =>
                        format(new Date(date), "MMM d, yyyy")
                      }
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="outbound"
                      name="Sent"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="inbound"
                      name="Received"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Delivery Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Status</CardTitle>
                <CardDescription>
                  Delivered vs Failed vs Pending
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.dailyTrends || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(new Date(date), "MMM d")}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(date) =>
                        format(new Date(date), "MMM d, yyyy")
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="delivered"
                      name="Delivered"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="failed"
                      name="Failed"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Classification Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Classifications</CardTitle>
                <CardDescription>
                  Breakdown by classification type
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.classifications || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="classification"
                      label={({ classification, percentage }) =>
                        `${classification.replace(/_/g, " ")} (${percentage.toFixed(0)}%)`
                      }
                    >
                      {(data?.classifications || []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            CLASSIFICATION_COLORS[entry.classification] ||
                            "#6b7280"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Worker Performance */}
            <Card>
              <CardHeader>
                <CardTitle>AI Worker Performance</CardTitle>
                <CardDescription>Messages sent by each worker</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.workerStats || []} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis type="number" className="text-xs" />
                    <YAxis
                      dataKey="worker"
                      type="category"
                      width={80}
                      className="text-xs"
                      tickFormatter={(w) => w.toUpperCase()}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="sent"
                      name="Sent"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="responses"
                      name="Responses"
                      fill="#22c55e"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Messages Tab - Table like Easify */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Messages</CardTitle>
                  <CardDescription>
                    {filteredMessages?.length || 0} messages shown
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">From Number</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="w-[80px] text-center">
                        Count
                      </TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[140px]">Time</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages?.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-mono text-sm">
                          {msg.direction === "inbound" ? msg.phone : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                                msg.direction === "inbound"
                                  ? "bg-purple-500/10 text-purple-500"
                                  : "bg-blue-500/10 text-blue-500",
                              )}
                            >
                              {msg.leadName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{msg.leadName}</div>
                              <div className="text-xs text-muted-foreground">
                                {msg.phone}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            <MessageSquare className="w-3 h-3 mr-1" />1
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(
                            msg.direction === "inbound"
                              ? "received"
                              : msg.status,
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="flex items-center gap-2">
                            {getClassificationBadge(msg.classification)}
                            <span className="truncate text-sm">{msg.body}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>
                            {format(new Date(msg.createdAt), "MM-dd-yyyy")}
                          </div>
                          <div className="text-xs">
                            {format(new Date(msg.createdAt), "h:mm:ss a")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredMessages || filteredMessages.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No messages found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classifications Tab */}
        <TabsContent value="classifications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.classifications || []).map((cls) => (
              <Card key={cls.classification}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CLASSIFICATION_COLORS[cls.classification] ||
                            "#6b7280",
                        }}
                      />
                      <span className="font-medium">
                        {cls.classification.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Badge variant="secondary">{cls.count}</Badge>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cls.percentage}%`,
                          backgroundColor:
                            CLASSIFICATION_COLORS[cls.classification] ||
                            "#6b7280",
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {cls.percentage.toFixed(1)}% of responses
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(data?.workerStats || []).map((worker) => (
              <Card key={worker.worker}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: `${WORKER_COLORS[worker.worker] || "#6b7280"}20`,
                        color: WORKER_COLORS[worker.worker] || "#6b7280",
                      }}
                    >
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {worker.worker.toUpperCase()}
                      </CardTitle>
                      <CardDescription>AI Worker</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Sent</div>
                      <div className="text-xl font-bold">{worker.sent}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Delivered</div>
                      <div className="text-xl font-bold">
                        {worker.delivered}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Responses</div>
                      <div className="text-xl font-bold">
                        {worker.responses}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rate</div>
                      <div className="text-xl font-bold text-green-500">
                        {worker.responseRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>SMS metrics by campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Responses</TableHead>
                      <TableHead className="text-right">Opt-Outs</TableHead>
                      <TableHead className="text-right">
                        Response Rate
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.campaignStats || []).map((campaign) => (
                      <TableRow key={campaign.campaignId}>
                        <TableCell className="font-medium">
                          {campaign.campaignName}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.sent.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.delivered.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.responses.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-500">
                          {campaign.optOuts.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              campaign.responseRate >= 10
                                ? "default"
                                : "secondary"
                            }
                          >
                            {campaign.responseRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.campaignStats ||
                      data.campaignStats.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No campaign data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
