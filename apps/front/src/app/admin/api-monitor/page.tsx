"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Zap,
  Target,
  MessageSquare,
  Phone,
  Mail,
  Database,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Webhook,
  Server,
  Globe,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { SignalHeatmapDashboard } from "@/components/signal-heatmap-dashboard";

// Types
interface APIEndpoint {
  id: string;
  name: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  category: "skip_trace" | "sms" | "email" | "enrichment" | "ai" | "webhook";
  status: "healthy" | "degraded" | "down";
  avg_latency_ms: number;
  calls_today: number;
  calls_last_hour: number;
  success_rate: number;
  last_error?: string;
  last_called: string;
}

interface WebhookEvent {
  id: string;
  event_type: string;
  source: string;
  status: "success" | "failed" | "pending";
  payload_size: string;
  received_at: string;
  processed_at: string | null;
}

interface UsageMetric {
  api: string;
  daily_limit: number;
  used_today: number;
  remaining: number;
  reset_at: string;
}

// Mock data
const mockEndpoints: APIEndpoint[] = [
  {
    id: "1",
    name: "Skip Trace - Individual",
    endpoint: "/api/realestate/skip-trace",
    method: "POST",
    category: "skip_trace",
    status: "healthy",
    avg_latency_ms: 245,
    calls_today: 1847,
    calls_last_hour: 156,
    success_rate: 94.2,
    last_called: "2024-01-15T14:32:15Z",
  },
  {
    id: "2",
    name: "Skip Trace - Bulk",
    endpoint: "/api/realestate/skip-trace-bulk",
    method: "POST",
    category: "skip_trace",
    status: "healthy",
    avg_latency_ms: 3200,
    calls_today: 23,
    calls_last_hour: 3,
    success_rate: 98.5,
    last_called: "2024-01-15T14:28:00Z",
  },
  {
    id: "3",
    name: "SignalHouse - Send SMS",
    endpoint: "/api/signalhouse/send",
    method: "POST",
    category: "sms",
    status: "healthy",
    avg_latency_ms: 180,
    calls_today: 8920,
    calls_last_hour: 423,
    success_rate: 97.8,
    last_called: "2024-01-15T14:32:45Z",
  },
  {
    id: "4",
    name: "Apollo - Enrich Person",
    endpoint: "/api/apollo/enrich",
    method: "POST",
    category: "enrichment",
    status: "degraded",
    avg_latency_ms: 890,
    calls_today: 567,
    calls_last_hour: 34,
    success_rate: 89.3,
    last_error: "Rate limit warning - 80% of hourly quota used",
    last_called: "2024-01-15T14:31:00Z",
  },
  {
    id: "5",
    name: "OpenAI - Generate Response",
    endpoint: "/api/ai/generate",
    method: "POST",
    category: "ai",
    status: "healthy",
    avg_latency_ms: 1200,
    calls_today: 423,
    calls_last_hour: 28,
    success_rate: 99.1,
    last_called: "2024-01-15T14:30:30Z",
  },
  {
    id: "6",
    name: "SendGrid - Send Email",
    endpoint: "/api/sendgrid/send",
    method: "POST",
    category: "email",
    status: "healthy",
    avg_latency_ms: 320,
    calls_today: 2150,
    calls_last_hour: 89,
    success_rate: 96.5,
    last_called: "2024-01-15T14:29:15Z",
  },
  {
    id: "7",
    name: "Twilio - Make Call",
    endpoint: "/api/twilio/call",
    method: "POST",
    category: "sms",
    status: "healthy",
    avg_latency_ms: 450,
    calls_today: 78,
    calls_last_hour: 5,
    success_rate: 92.3,
    last_called: "2024-01-15T14:25:00Z",
  },
  {
    id: "8",
    name: "Gianna Loop - Process",
    endpoint: "/api/gianna/loop",
    method: "POST",
    category: "ai",
    status: "healthy",
    avg_latency_ms: 350,
    calls_today: 234,
    calls_last_hour: 12,
    success_rate: 98.7,
    last_called: "2024-01-15T14:20:00Z",
  },
];

const mockWebhooks: WebhookEvent[] = [
  {
    id: "wh-001",
    event_type: "sms.delivered",
    source: "SignalHouse",
    status: "success",
    payload_size: "1.2 KB",
    received_at: "2024-01-15T14:32:45Z",
    processed_at: "2024-01-15T14:32:46Z",
  },
  {
    id: "wh-002",
    event_type: "sms.reply",
    source: "SignalHouse",
    status: "success",
    payload_size: "2.1 KB",
    received_at: "2024-01-15T14:31:20Z",
    processed_at: "2024-01-15T14:31:21Z",
  },
  {
    id: "wh-003",
    event_type: "email.opened",
    source: "SendGrid",
    status: "success",
    payload_size: "0.8 KB",
    received_at: "2024-01-15T14:30:15Z",
    processed_at: "2024-01-15T14:30:16Z",
  },
  {
    id: "wh-004",
    event_type: "call.completed",
    source: "Twilio",
    status: "success",
    payload_size: "3.5 KB",
    received_at: "2024-01-15T14:28:00Z",
    processed_at: "2024-01-15T14:28:02Z",
  },
  {
    id: "wh-005",
    event_type: "lead.enriched",
    source: "Apollo",
    status: "success",
    payload_size: "5.2 KB",
    received_at: "2024-01-15T14:25:30Z",
    processed_at: "2024-01-15T14:25:32Z",
  },
];

const mockUsage: UsageMetric[] = [
  {
    api: "RealEstateAPI Skip Trace",
    daily_limit: 5000,
    used_today: 1870,
    remaining: 3130,
    reset_at: "2024-01-16T00:00:00Z",
  },
  {
    api: "SignalHouse SMS",
    daily_limit: 50000,
    used_today: 8920,
    remaining: 41080,
    reset_at: "2024-01-16T00:00:00Z",
  },
  {
    api: "Apollo Enrichment",
    daily_limit: 1000,
    used_today: 567,
    remaining: 433,
    reset_at: "2024-01-16T00:00:00Z",
  },
  {
    api: "OpenAI GPT-4",
    daily_limit: 10000,
    used_today: 423,
    remaining: 9577,
    reset_at: "2024-01-16T00:00:00Z",
  },
  {
    api: "SendGrid Email",
    daily_limit: 100000,
    used_today: 2150,
    remaining: 97850,
    reset_at: "2024-01-16T00:00:00Z",
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  skip_trace: <Target className="h-4 w-4 text-green-500" />,
  sms: <MessageSquare className="h-4 w-4 text-purple-500" />,
  email: <Mail className="h-4 w-4 text-blue-500" />,
  enrichment: <Database className="h-4 w-4 text-orange-500" />,
  ai: <Zap className="h-4 w-4 text-yellow-500" />,
  webhook: <Webhook className="h-4 w-4 text-pink-500" />,
};

const statusColors: Record<string, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
};

export default function APIMonitorPage() {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>(mockEndpoints);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>(mockWebhooks);
  const [usage, setUsage] = useState<UsageMetric[]>(mockUsage);
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setEndpoints((prev) =>
        prev.map((ep) => ({
          ...ep,
          calls_last_hour: Math.max(0, ep.calls_last_hour + Math.floor(Math.random() * 5) - 2),
          avg_latency_ms: Math.max(50, ep.avg_latency_ms + Math.floor(Math.random() * 50) - 25),
          last_called: new Date().toISOString(),
        }))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const filteredEndpoints = categoryFilter === "all"
    ? endpoints
    : endpoints.filter((ep) => ep.category === categoryFilter);

  const totalCallsToday = endpoints.reduce((sum, ep) => sum + ep.calls_today, 0);
  const avgSuccessRate = endpoints.reduce((sum, ep) => sum + ep.success_rate, 0) / endpoints.length;
  const healthyEndpoints = endpoints.filter((ep) => ep.status === "healthy").length;

  return (
    <div className="flex flex-col min-h-screen p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-500" />
              API Monitor
            </h1>
            <p className="text-muted-foreground">
              Real-time visibility into all API integrations and signals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All APIs</SelectItem>
                <SelectItem value="skip_trace">Skip Trace</SelectItem>
                <SelectItem value="sms">SMS/Calls</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="enrichment">Enrichment</SelectItem>
                <SelectItem value="ai">AI/GPT</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">System Health</p>
                  <p className="text-2xl font-bold text-green-600">
                    {healthyEndpoints}/{endpoints.length} Healthy
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">API Calls Today</p>
                  <p className="text-2xl font-bold">{totalCallsToday.toLocaleString()}</p>
                </div>
                <Server className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Success Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{avgSuccessRate.toFixed(1)}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Webhooks Today</p>
                  <p className="text-2xl font-bold">{webhooks.length * 47}</p>
                </div>
                <Webhook className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Live Pulse
            </TabsTrigger>
            <TabsTrigger value="endpoints">
              <Server className="h-4 w-4 mr-2" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="usage">
              <BarChart3 className="h-4 w-4 mr-2" />
              Usage & Limits
            </TabsTrigger>
            <TabsTrigger value="heatmaps">
              <Globe className="h-4 w-4 mr-2" />
              Heatmaps
            </TabsTrigger>
          </TabsList>

          {/* Live Pulse Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Real-time API Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500 animate-pulse" />
                    Real-Time API Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {endpoints.slice(0, 6).map((ep) => (
                      <div
                        key={ep.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${statusColors[ep.status]}`} />
                          {categoryIcons[ep.category]}
                          <div>
                            <p className="text-sm font-medium">{ep.name}</p>
                            <p className="text-xs text-muted-foreground">{ep.avg_latency_ms}ms avg</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{ep.calls_last_hour}/hr</p>
                          <p className="text-xs text-muted-foreground">{ep.success_rate}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Webhook Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-orange-500" />
                    Recent Webhook Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium">{wh.event_type}</p>
                            <p className="text-xs text-muted-foreground">from {wh.source}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{wh.payload_size}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(wh.received_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Gauges */}
            <Card>
              <CardHeader>
                <CardTitle>API Usage Quotas</CardTitle>
                <CardDescription>Daily limits and current usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {usage.map((u) => {
                    const percent = (u.used_today / u.daily_limit) * 100;
                    const isWarning = percent > 70;
                    const isCritical = percent > 90;

                    return (
                      <div key={u.api} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{u.api}</span>
                          <span className={isCritical ? "text-red-500" : isWarning ? "text-yellow-500" : ""}>
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={percent}
                          className={`h-3 ${isCritical ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{u.used_today.toLocaleString()} used</span>
                          <span>{u.remaining.toLocaleString()} left</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Latency</TableHead>
                      <TableHead className="text-right">Calls Today</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead>Last Called</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEndpoints.map((ep) => (
                      <TableRow key={ep.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {categoryIcons[ep.category]}
                            <div>
                              <p className="font-medium">{ep.name}</p>
                              <code className="text-xs text-muted-foreground">{ep.endpoint}</code>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ep.method}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusColors[ep.status]}`} />
                            <span className="capitalize">{ep.status}</span>
                            {ep.last_error && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{ep.last_error}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={ep.avg_latency_ms > 1000 ? "text-yellow-500" : ""}>
                            {ep.avg_latency_ms}ms
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {ep.calls_today.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              ep.success_rate >= 95
                                ? "text-green-500"
                                : ep.success_rate >= 85
                                ? "text-yellow-500"
                                : "text-red-500"
                            }
                          >
                            {ep.success_rate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ep.last_called).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Event Stream</CardTitle>
                <CardDescription>
                  Incoming webhooks from integrated services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payload</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {wh.event_type}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{wh.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="capitalize">{wh.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{wh.payload_size}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(wh.received_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {wh.processed_at
                            ? new Date(wh.processed_at).toLocaleTimeString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usage.map((u) => {
                const percent = (u.used_today / u.daily_limit) * 100;
                const isWarning = percent > 70;
                const isCritical = percent > 90;

                return (
                  <Card key={u.api} className={isCritical ? "border-red-500" : isWarning ? "border-yellow-500" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{u.api}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-3xl font-bold">{u.used_today.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            of {u.daily_limit.toLocaleString()} daily limit
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${isCritical ? "text-red-500" : isWarning ? "text-yellow-500" : "text-green-500"}`}>
                            {u.remaining.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">remaining</p>
                        </div>
                      </div>
                      <Progress
                        value={percent}
                        className={`h-4 ${isCritical ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Resets at {new Date(u.reset_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Heatmaps Tab */}
          <TabsContent value="heatmaps" className="mt-4">
            <SignalHeatmapDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
