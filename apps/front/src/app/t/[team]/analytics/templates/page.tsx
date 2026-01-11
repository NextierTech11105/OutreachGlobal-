"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentTeam } from "@/features/team/team.context";
import {
  TEMPLATE_PERFORMANCE_QUERY,
  type TemplatePerformanceMetrics,
} from "@/features/analytics/queries/template-performance.queries";

/**
 * Template Performance Dashboard
 *
 * Shows analytics for all SMS templates:
 * - Total sent, delivery rate, reply rate
 * - Positive/negative sentiment breakdown
 * - Opt-out rate
 * - Composite score
 * - Touch-by-touch breakdown
 */

type SortKey = keyof TemplatePerformanceMetrics;
type SortDirection = "asc" | "desc";

const TIME_PERIODS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const LANE_COLORS: Record<string, string> = {
  GIANNA: "bg-purple-500/10 text-purple-500",
  CATHY: "bg-orange-500/10 text-orange-500",
  SABRINA: "bg-emerald-500/10 text-emerald-500",
  NEVA: "bg-blue-500/10 text-blue-500",
  cold_opener: "bg-purple-500/10 text-purple-500",
  follow_up: "bg-orange-500/10 text-orange-500",
  closer: "bg-emerald-500/10 text-emerald-500",
};

export default function TemplatePerformancePage() {
  const { team, teamId, isTeamReady } = useCurrentTeam();

  const [timePeriod, setTimePeriod] = useState("30d");
  const [sortKey, setSortKey] = useState<SortKey>("compositeScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplatePerformanceMetrics | null>(null);

  // Fetch template performance data
  const { data, loading } = useQuery(TEMPLATE_PERFORMANCE_QUERY, {
    variables: { teamId: teamId, period: timePeriod },
    fetchPolicy: "cache-and-network",
  });

  const templates = data?.templatePerformance?.nodes ?? [];

  const sortedData = useMemo(() => {
    return [...templates].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
        : String(bVal ?? "").localeCompare(String(aVal ?? ""));
    });
  }, [templates, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const SortHeader = ({
    column,
    label,
  }: {
    column: SortKey;
    label: string;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === column ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const formatPercent = (val: number | null) =>
    val != null ? `${(val * 100).toFixed(1)}%` : "N/A";
  const formatNumber = (val: number) => val.toLocaleString();

  // Summary stats
  const totals = useMemo(() => {
    return templates.reduce(
      (acc, t) => ({
        sent: acc.sent + t.totalSent,
        delivered: acc.delivered + t.totalDelivered,
        replied: acc.replied + t.totalReplied,
        meetings: acc.meetings + t.meetingsBooked,
        optOuts: acc.optOuts + t.optOuts,
      }),
      { sent: 0, delivered: 0, replied: 0, meetings: 0, optOuts: 0 },
    );
  }, [templates]);

  if (loading && templates.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Template Performance
            </h2>
            <p className="text-muted-foreground">
              Analytics for all SMS templates
            </p>
          </div>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(totals.sent)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Delivery Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.sent > 0
                  ? formatPercent(totals.delivered / totals.sent)
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.delivered > 0
                  ? formatPercent(totals.replied / totals.delivered)
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Meetings Booked
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(totals.meetings)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Opt-Out Rate
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.sent > 0
                  ? formatPercent(totals.optOuts / totals.sent)
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Template Breakdown</CardTitle>
            <CardDescription>
              {templates.length === 0
                ? "No template performance data yet"
                : "Click any row to see touch-by-touch breakdown"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No template performance data available for this period. Data
                will appear once templates start sending.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader column="templateName" label="Template" />
                    <TableHead>Lane</TableHead>
                    <SortHeader column="totalSent" label="Sent" />
                    <SortHeader column="deliveryRate" label="Delivery %" />
                    <SortHeader column="replyRate" label="Reply %" />
                    <SortHeader column="positiveRate" label="Positive %" />
                    <SortHeader column="optOutRate" label="Opt-Out %" />
                    <SortHeader column="compositeScore" label="Score" />
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((template) => (
                    <TableRow
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <div>{template.templateName}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {template.templateId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.campaignLane && (
                          <Badge
                            className={cn(
                              "font-medium",
                              LANE_COLORS[template.campaignLane] || "",
                            )}
                          >
                            {template.campaignLane}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatNumber(template.totalSent)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            (template.deliveryRate ?? 0) >= 0.95
                              ? "text-green-500"
                              : ""
                          }
                        >
                          {formatPercent(template.deliveryRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            (template.replyRate ?? 0) >= 0.1
                              ? "text-green-500"
                              : ""
                          }
                        >
                          {formatPercent(template.replyRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            (template.positiveRate ?? 0) >= 0.5
                              ? "text-green-500"
                              : ""
                          }
                        >
                          {formatPercent(template.positiveRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            (template.optOutRate ?? 0) > 0.02
                              ? "text-red-500"
                              : ""
                          }
                        >
                          {formatPercent(template.optOutRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-bold",
                              (template.compositeScore ?? 0) >= 80
                                ? "text-green-500"
                                : (template.compositeScore ?? 0) >= 60
                                  ? "text-yellow-500"
                                  : "text-red-500",
                            )}
                          >
                            {template.compositeScore?.toFixed(1) ?? "N/A"}
                          </span>
                          {(template.compositeScore ?? 0) >= 80 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Template Detail Dialog */}
        <Dialog
          open={!!selectedTemplate}
          onOpenChange={() => setSelectedTemplate(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTemplate?.templateName}</DialogTitle>
              <DialogDescription className="font-mono">
                {selectedTemplate?.templateId}
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Touch Breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">
                    Touch-by-Touch Performance
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((touch) => {
                      const sent =
                        (selectedTemplate as any)[`touch${touch}Sent`] ?? 0;
                      const replied =
                        (selectedTemplate as any)[`touch${touch}Replied`] ?? 0;
                      const rate = sent > 0 ? replied / sent : 0;
                      return (
                        <Card key={touch}>
                          <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground mb-1">
                              Touch {touch}
                            </div>
                            <div className="text-lg font-bold">
                              {formatPercent(rate)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {replied}/{formatNumber(sent)}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-3">Response Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Positive</span>
                        <span className="text-green-500">
                          {selectedTemplate.positiveReplies}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Questions</span>
                        <span className="text-blue-500">
                          {selectedTemplate.questionReplies}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Neutral</span>
                        <span>{selectedTemplate.neutralReplies}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Negative</span>
                        <span className="text-red-500">
                          {selectedTemplate.negativeReplies}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Conversions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Emails Captured
                        </span>
                        <span>{selectedTemplate.emailsCaptured}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Calls Scheduled
                        </span>
                        <span>{selectedTemplate.callsScheduled}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Meetings Booked
                        </span>
                        <span className="text-green-500 font-bold">
                          {selectedTemplate.meetingsBooked}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Metrics */}
                <div>
                  <h4 className="font-semibold mb-3">Compliance</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-muted-foreground">Opt-Outs</div>
                      <div className="text-lg font-bold text-red-500">
                        {selectedTemplate.optOuts}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-muted-foreground">Wrong Numbers</div>
                      <div className="text-lg font-bold">
                        {selectedTemplate.wrongNumbers}
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <div className="text-muted-foreground">Complaints</div>
                      <div
                        className={cn(
                          "text-lg font-bold",
                          selectedTemplate.complaints > 0
                            ? "text-red-500"
                            : "text-green-500",
                        )}
                      >
                        {selectedTemplate.complaints}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
