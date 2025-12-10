"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Phone,
  Mail,
  MessageSquare,
  Database,
  Target,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { sf } from "@/lib/utils/safe-format";

// Types
interface HeatmapCell {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number;
  label: string;
}

interface SignalMetric {
  id: string;
  name: string;
  value: number;
  change: number; // percentage change
  changeType: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: string;
}

interface CampaignMetric {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  delivered: number;
  responses: number;
  positive: number;
  negative: number;
  response_rate: number;
}

// Heatmap color scale (green to red intensity)
const getHeatColor = (value: number, max: number): string => {
  const intensity = Math.min(value / max, 1);
  if (intensity === 0) return "bg-muted";
  if (intensity < 0.2) return "bg-green-100 dark:bg-green-900/30";
  if (intensity < 0.4) return "bg-green-300 dark:bg-green-700/50";
  if (intensity < 0.6) return "bg-yellow-300 dark:bg-yellow-600/50";
  if (intensity < 0.8) return "bg-orange-400 dark:bg-orange-600/60";
  return "bg-red-500 dark:bg-red-600/70";
};

// Generate mock heatmap data
const generateHeatmapData = (metric: string): HeatmapCell[] => {
  const data: HeatmapCell[] = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Business hours have higher activity
      const isBusinessHour = hour >= 9 && hour <= 17;
      const isWeekday = day >= 1 && day <= 5;
      const baseValue = isBusinessHour && isWeekday ? 50 : 10;
      const variance = Math.floor(Math.random() * 50);
      const value = baseValue + variance;

      data.push({
        day,
        hour,
        value,
        label: `${days[day]} ${hour}:00 - ${value} ${metric}`,
      });
    }
  }
  return data;
};

// Heatmap Component
function ActivityHeatmap({
  data,
  title,
  maxValue,
}: {
  data: HeatmapCell[];
  title: string;
  maxValue: number;
}) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Hour labels */}
          <div className="flex ml-6 mb-1">
            {hours.map((hour) => (
              <div
                key={hour}
                className="w-3 text-[8px] text-muted-foreground text-center"
              >
                {hour % 6 === 0 ? hour : ""}
              </div>
            ))}
          </div>
          {/* Grid */}
          <TooltipProvider>
            {days.map((dayLabel, dayIndex) => (
              <div key={dayIndex} className="flex items-center">
                <div className="w-6 text-[10px] text-muted-foreground">
                  {dayLabel}
                </div>
                {hours.map((hour) => {
                  const cell = data.find(
                    (c) => c.day === dayIndex && c.hour === hour
                  );
                  return (
                    <Tooltip key={`${dayIndex}-${hour}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-3 h-3 rounded-sm m-[1px] cursor-pointer transition-all hover:scale-150 hover:z-10 ${getHeatColor(
                            cell?.value || 0,
                            maxValue
                          )}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {cell?.label || "No data"}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </TooltipProvider>
          {/* Legend */}
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/30" />
            <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-700/50" />
            <div className="w-3 h-3 rounded-sm bg-yellow-300 dark:bg-yellow-600/50" />
            <div className="w-3 h-3 rounded-sm bg-orange-400 dark:bg-orange-600/60" />
            <div className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-600/70" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Response Rate Bar
function ResponseRateBar({ campaign }: { campaign: CampaignMetric }) {
  const deliveryRate = (campaign.delivered / campaign.sent) * 100;
  const responseRate = campaign.response_rate;
  const positiveRate = (campaign.positive / (campaign.responses || 1)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium truncate max-w-[200px]">{campaign.campaign_name}</span>
        <span className="text-muted-foreground">{campaign.sent} sent</span>
      </div>
      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
        <div
          className="bg-blue-500 h-full transition-all duration-500"
          style={{ width: `${deliveryRate}%` }}
          title={`Delivered: ${deliveryRate.toFixed(1)}%`}
        />
      </div>
      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
        <div
          className="bg-green-500 h-full transition-all duration-500"
          style={{ width: `${positiveRate}%` }}
          title={`Positive: ${positiveRate.toFixed(1)}%`}
        />
        <div
          className="bg-red-400 h-full transition-all duration-500"
          style={{ width: `${100 - positiveRate}%` }}
          title={`Negative/Neutral: ${(100 - positiveRate).toFixed(1)}%`}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{responseRate.toFixed(1)}% response rate</span>
        <span className="text-green-500">{campaign.positive} positive</span>
      </div>
    </div>
  );
}

// Main Dashboard Component
export function SignalHeatmapDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [apiCallsHeatmap, setApiCallsHeatmap] = useState<HeatmapCell[]>([]);
  const [smsHeatmap, setSmsHeatmap] = useState<HeatmapCell[]>([]);
  const [skipTraceHeatmap, setSkipTraceHeatmap] = useState<HeatmapCell[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Signal metrics - starts empty, populated by real API data
  const [signalMetrics, setSignalMetrics] = useState<SignalMetric[]>([
    {
      id: "api_calls",
      name: "API Calls Today",
      value: 0,
      change: 0,
      changeType: "neutral",
      icon: <Zap className="h-4 w-4" />,
      color: "text-blue-500",
    },
    {
      id: "skip_traces",
      name: "Skip Traces",
      value: 0,
      change: 0,
      changeType: "neutral",
      icon: <Target className="h-4 w-4" />,
      color: "text-green-500",
    },
    {
      id: "sms_sent",
      name: "SMS Sent",
      value: 0,
      change: 0,
      changeType: "neutral",
      icon: <MessageSquare className="h-4 w-4" />,
      color: "text-purple-500",
    },
    {
      id: "emails_sent",
      name: "Emails Sent",
      value: 0,
      change: 0,
      changeType: "neutral",
      icon: <Mail className="h-4 w-4" />,
      color: "text-orange-500",
    },
    {
      id: "calls_made",
      name: "Calls Made",
      value: 0,
      change: 0,
      changeType: "neutral",
      icon: <Phone className="h-4 w-4" />,
      color: "text-teal-500",
    },
    {
      id: "data_enriched",
      name: "Records Enriched",
      value: 0,
      change: 0,
      changeType: "neutral",
      icon: <Database className="h-4 w-4" />,
      color: "text-indigo-500",
    },
  ]);

  // Campaign metrics - starts empty, populated by real data from campaigns API
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetric[]>([]);

  // Live API pulse - starts empty, populated by real data
  const [livePulse, setLivePulse] = useState<Array<{
    api: string;
    endpoint: string;
    status: "success" | "pending" | "failed";
    time: string;
    count: number;
  }>>([]);

  // Load heatmap data and real metrics
  useEffect(() => {
    refreshData();
  }, [timeRange]);

  const refreshData = async () => {
    setIsRefreshing(true);

    // Fetch real usage data from API
    try {
      const usageRes = await fetch("/api/enrichment/usage");
      if (usageRes.ok) {
        const data = await usageRes.json();
        setSignalMetrics((prev) =>
          prev.map((m) => {
            if (m.id === "skip_traces") {
              return { ...m, value: data.skipTrace?.used || 0 };
            }
            if (m.id === "data_enriched") {
              return { ...m, value: data.apollo?.used || 0 };
            }
            return m;
          })
        );
      }
    } catch (err) {
      console.error("Failed to fetch usage metrics:", err);
    }

    // Fetch campaign data
    try {
      const campaignRes = await fetch("/api/campaigns/stats");
      if (campaignRes.ok) {
        const data = await campaignRes.json();
        if (data.campaigns && Array.isArray(data.campaigns)) {
          setCampaignMetrics(data.campaigns);
        }
      }
    } catch (err) {
      console.error("Failed to fetch campaign stats:", err);
    }

    // Generate placeholder heatmap (will be replaced with real activity logs)
    setApiCallsHeatmap(generateHeatmapData("API calls"));
    setSmsHeatmap(generateHeatmapData("messages"));
    setSkipTraceHeatmap(generateHeatmapData("traces"));

    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Signal Pulse Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time visibility into data signals and campaign performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Signal Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {signalMetrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className={metric.color}>{metric.icon}</div>
                <Badge
                  variant={metric.changeType === "up" ? "default" : metric.changeType === "down" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {metric.changeType === "up" && <TrendingUp className="h-3 w-3 mr-1" />}
                  {metric.changeType === "down" && <TrendingDown className="h-3 w-3 mr-1" />}
                  {metric.change > 0 ? "+" : ""}{metric.change}%
                </Badge>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{sf(metric.value)}</div>
                <div className="text-xs text-muted-foreground">{metric.name}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heatmaps Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              API Calls Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={apiCallsHeatmap} title="" maxValue={100} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              SMS Activity Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={smsHeatmap} title="" maxValue={100} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Skip Trace Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={skipTraceHeatmap} title="" maxValue={100} />
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Campaign Performance
          </CardTitle>
          <CardDescription>
            Response rates and engagement metrics by campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaignMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No Campaigns Yet</p>
              <p className="text-xs">Campaign metrics will appear here once you create campaigns</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaignMetrics.map((campaign) => (
                <ResponseRateBar key={campaign.campaign_id} campaign={campaign} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live API Pulse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500 animate-pulse" />
            Live API Pulse
          </CardTitle>
          <CardDescription>
            Real-time API activity stream
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {livePulse.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No API activity recorded yet</p>
                <p className="text-xs">Activity will appear here as API calls are made</p>
              </div>
            ) : (
              livePulse.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.status === "success" ? "bg-green-500" : item.status === "failed" ? "bg-red-500" : "bg-yellow-500 animate-pulse"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium">{item.api}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.endpoint}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.count} calls</div>
                    <div className="text-xs text-muted-foreground">{item.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
