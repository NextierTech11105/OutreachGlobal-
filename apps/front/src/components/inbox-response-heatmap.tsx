"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Tag,
  RefreshCw,
  TrendingUp,
  MessageSquare,
  Phone,
  Mail,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  PhoneCall,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Inbox Label definitions matching inbox-sidebar.tsx
const INBOX_LABELS = [
  // Funnel Stages
  { id: "cold", name: "Cold (0%)", color: "bg-slate-500", icon: Tag },
  {
    id: "mobile-captured",
    name: "Mobile Captured",
    color: "bg-blue-500",
    icon: Phone,
  },
  {
    id: "email-captured",
    name: "Email Captured",
    color: "bg-green-500",
    icon: Mail,
  },
  { id: "gold", name: "🏆 GOLD (100%)", color: "bg-amber-500", icon: Star },
  // Response Types
  {
    id: "needs-help",
    name: "Needs Help Now",
    color: "bg-red-500",
    icon: AlertCircle,
  },
  {
    id: "has-questions",
    name: "Has Questions",
    color: "bg-yellow-500",
    icon: MessageSquare,
  },
  {
    id: "wants-call",
    name: "Wants Call",
    color: "bg-purple-500",
    icon: PhoneCall,
  },
  { id: "called-back", name: "Called Back", color: "bg-cyan-500", icon: Phone },
  {
    id: "yes-content",
    name: "Yes to Content Link",
    color: "bg-green-500",
    icon: Link2,
  },
  // Outcomes
  {
    id: "push-call-center",
    name: "Push to Call Center",
    color: "bg-orange-500",
    icon: Phone,
  },
  { id: "sold", name: "Sold", color: "bg-emerald-500", icon: CheckCircle },
  { id: "stop", name: "Stop (Opted Out)", color: "bg-gray-500", icon: XCircle },
  {
    id: "wrong-number",
    name: "Wrong Number",
    color: "bg-red-500",
    icon: XCircle,
  },
];

interface HeatmapCell {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number;
  labels: { [labelId: string]: number };
}

interface LabelStats {
  id: string;
  name: string;
  count: number;
  change: number;
  color: string;
}

// Green color scale for positive activity (as requested)
const getGreenHeatColor = (value: number, max: number): string => {
  const intensity = Math.min(value / max, 1);
  if (intensity === 0) return "bg-muted";
  if (intensity < 0.15) return "bg-green-100 dark:bg-green-950/40";
  if (intensity < 0.3) return "bg-green-200 dark:bg-green-900/50";
  if (intensity < 0.45) return "bg-green-300 dark:bg-green-800/60";
  if (intensity < 0.6) return "bg-green-400 dark:bg-green-700/70";
  if (intensity < 0.75) return "bg-green-500 dark:bg-green-600/80";
  if (intensity < 0.9) return "bg-green-600 dark:bg-green-500/90";
  return "bg-green-700 dark:bg-green-400";
};

// Generate heatmap data from inbox activity
const generateInboxHeatmapData = (
  selectedLabels: string[],
): { cells: HeatmapCell[]; maxValue: number } => {
  const cells: HeatmapCell[] = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let maxValue = 0;

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Simulate realistic response patterns:
      // - More activity during business hours (9-5)
      // - More activity on weekdays
      // - Peak response times around 10am and 2pm
      const isBusinessHour = hour >= 9 && hour <= 17;
      const isWeekday = day >= 1 && day <= 5;
      const isPeakHour =
        (hour >= 10 && hour <= 11) || (hour >= 14 && hour <= 15);

      let baseValue = 5;
      if (isWeekday) baseValue += 15;
      if (isBusinessHour) baseValue += 25;
      if (isPeakHour) baseValue += 20;

      // Add variance
      const variance = Math.floor(Math.random() * 20);
      const value = baseValue + variance;
      maxValue = Math.max(maxValue, value);

      // Distribute across labels
      const labels: { [key: string]: number } = {};
      selectedLabels.forEach((labelId) => {
        // Weighted distribution based on label type
        let labelMultiplier = 1;
        if (labelId === "needs-help" || labelId === "has-questions") {
          labelMultiplier = isPeakHour ? 1.5 : 0.8; // More urgent during peaks
        } else if (
          labelId === "mobile-captured" ||
          labelId === "email-captured"
        ) {
          labelMultiplier = isWeekday ? 1.3 : 0.7; // More captures on weekdays
        } else if (labelId === "wants-call" || labelId === "called-back") {
          labelMultiplier = isBusinessHour ? 1.4 : 0.5; // Call activity during business hours
        }
        labels[labelId] = Math.floor(
          (value / selectedLabels.length) * labelMultiplier,
        );
      });

      cells.push({
        day,
        hour,
        value,
        labels,
      });
    }
  }

  return { cells, maxValue };
};

// Compact Heatmap Grid
function ResponseHeatmapGrid({
  data,
  maxValue,
  selectedLabels,
}: {
  data: HeatmapCell[];
  maxValue: number;
  selectedLabels: string[];
}) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Hour labels */}
        <div className="flex ml-6 mb-1">
          {hours.map((hour) => (
            <div
              key={hour}
              className="w-4 text-[9px] text-muted-foreground text-center"
            >
              {hour % 4 === 0 ? hour : ""}
            </div>
          ))}
        </div>
        {/* Grid */}
        <TooltipProvider>
          {days.map((dayLabel, dayIndex) => (
            <div key={dayIndex} className="flex items-center">
              <div className="w-6 text-[10px] text-muted-foreground font-medium">
                {dayLabel}
              </div>
              {hours.map((hour) => {
                const cell = data.find(
                  (c) => c.day === dayIndex && c.hour === hour,
                );
                const dayNames = [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ];
                const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
                const labelBreakdown = selectedLabels
                  .map((id) => {
                    const label = INBOX_LABELS.find((l) => l.id === id);
                    return label
                      ? `${label.name}: ${cell?.labels[id] || 0}`
                      : null;
                  })
                  .filter(Boolean)
                  .join("\n");

                return (
                  <Tooltip key={`${dayIndex}-${hour}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-sm m-[1px] cursor-pointer transition-all hover:scale-125 hover:z-10",
                          getGreenHeatColor(cell?.value || 0, maxValue),
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="text-xs max-w-[200px]"
                    >
                      <div className="font-medium">
                        {dayNames[dayIndex]} {timeLabel}
                      </div>
                      <div className="text-muted-foreground">
                        Total: {cell?.value || 0} responses
                      </div>
                      {selectedLabels.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-border/50 whitespace-pre-line text-[10px]">
                          {labelBreakdown}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </TooltipProvider>
        {/* Green Legend */}
        <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-950/40" />
          <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-800/60" />
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600/80" />
          <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-400" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// Label Stats Card
function LabelStatsRow({ stats }: { stats: LabelStats[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {stats.map((stat) => {
        const label = INBOX_LABELS.find((l) => l.id === stat.id);
        const Icon = label?.icon || Tag;

        return (
          <div
            key={stat.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={cn("w-2 h-2 rounded-full", stat.color)} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{stat.count}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {stat.name}
              </div>
            </div>
            {stat.change !== 0 && (
              <Badge
                variant={stat.change > 0 ? "default" : "secondary"}
                className="text-[9px] px-1 py-0"
              >
                {stat.change > 0 ? "+" : ""}
                {stat.change}%
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Main Inbox Response Heatmap Dashboard
export function InboxResponseHeatmap() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([
    "needs-help",
    "mobile-captured",
    "email-captured",
    "wants-call",
    "called-back",
    "yes-content",
  ]);
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [maxValue, setMaxValue] = useState(100);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [labelStats, setLabelStats] = useState<LabelStats[]>([]);

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  };

  const refreshData = async () => {
    setIsRefreshing(true);

    // Generate heatmap data
    const { cells, maxValue: max } = generateInboxHeatmapData(selectedLabels);
    setHeatmapData(cells);
    setMaxValue(max);

    // Calculate label stats
    const stats: LabelStats[] = INBOX_LABELS.map((label) => ({
      id: label.id,
      name: label.name,
      count: Math.floor(Math.random() * 500) + 50,
      change: Math.floor(Math.random() * 40) - 15,
      color: label.color,
    }));
    setLabelStats(stats);

    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshData();
  }, [timeRange, selectedLabels]);

  // Calculate totals
  const totalResponses = labelStats.reduce((sum, s) => sum + s.count, 0);
  const positiveLabels = [
    "mobile-captured",
    "email-captured",
    "gold",
    "sold",
    "yes-content",
  ];
  const positiveResponses = labelStats
    .filter((s) => positiveLabels.includes(s.id))
    .reduce((sum, s) => sum + s.count, 0);
  const positiveRate =
    totalResponses > 0
      ? ((positiveResponses / totalResponses) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="h-5 w-5 text-green-500" />
            Inbox Response Activity
          </h3>
          <p className="text-sm text-muted-foreground">
            Track when leads respond and how they&apos;re labeled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw
              className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-3">
          <div className="text-2xl font-bold">{totalResponses}</div>
          <div className="text-xs text-muted-foreground">Total Responses</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-500">
            {positiveResponses}
          </div>
          <div className="text-xs text-muted-foreground">Positive Outcomes</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold flex items-center gap-1">
            {positiveRate}%
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-xs text-muted-foreground">Conversion Rate</div>
        </Card>
      </div>

      {/* Label Filter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filter by Label</CardTitle>
          <CardDescription className="text-xs">
            Click labels to toggle visibility in the heatmap
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {INBOX_LABELS.map((label) => {
              const isSelected = selectedLabels.includes(label.id);
              const Icon = label.icon;
              return (
                <Button
                  key={label.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs gap-1",
                    isSelected && label.color.replace("bg-", "bg-opacity-90 "),
                  )}
                  onClick={() => toggleLabel(label.id)}
                >
                  <Icon className="h-3 w-3" />
                  {label.name}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-500" />
            Weekly Activity Heatmap
          </CardTitle>
          <CardDescription className="text-xs">
            Response patterns by day and hour - optimized times shown in darker
            green
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponseHeatmapGrid
            data={heatmapData}
            maxValue={maxValue}
            selectedLabels={selectedLabels}
          />
        </CardContent>
      </Card>

      {/* Label Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Label Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Response counts by label type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LabelStatsRow stats={labelStats} />
        </CardContent>
      </Card>
    </div>
  );
}

// Compact version for sidebar or dashboard widgets
export function InboxHeatmapCompact() {
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [maxValue, setMaxValue] = useState(100);

  useEffect(() => {
    const { cells, maxValue: max } = generateInboxHeatmapData([
      "needs-help",
      "mobile-captured",
      "wants-call",
    ]);
    setHeatmapData(cells);
    setMaxValue(max);
  }, []);

  return (
    <Card className="p-3">
      <div className="text-sm font-medium mb-2 flex items-center gap-2">
        <Tag className="h-4 w-4 text-green-500" />
        Response Activity
      </div>
      <ResponseHeatmapGrid
        data={heatmapData}
        maxValue={maxValue}
        selectedLabels={["needs-help", "mobile-captured", "wants-call"]}
      />
    </Card>
  );
}
