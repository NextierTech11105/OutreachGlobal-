"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type WorkflowMetrics,
  type WorkflowHeatmapData,
  getHeatColor,
  calculateHeatScore,
} from "@/lib/signalhouse/client";
import { cn } from "@/lib/utils";
import {
  FlameIcon,
  MailIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

// ==========================================
// WORKFLOW HEATMAP VISUALIZATION
// High-impact workflow prioritization for GIANNA
// ==========================================

interface WorkflowHeatmapProps {
  data?: WorkflowHeatmapData;
  onWorkflowClick?: (workflowId: string) => void;
  className?: string;
}

// Mock data for development/preview
const MOCK_HEATMAP_DATA: WorkflowHeatmapData = {
  workflows: [
    {
      workflowId: "wf-initial-homeowner",
      name: "Homeowner Initial Outreach",
      campaignContext: "initial",
      metrics: {
        totalSent: 2500,
        delivered: 2350,
        responses: 187,
        emailCaptures: 42,
        optOuts: 23,
        interested: 67,
        questions: 31,
      },
      conversionRate: 0.0179,
      responseRate: 0.0796,
      heatScore: 85,
    },
    {
      workflowId: "wf-retarget-distressed",
      name: "Distressed Property Retarget",
      campaignContext: "retarget",
      metrics: {
        totalSent: 1200,
        delivered: 1150,
        responses: 89,
        emailCaptures: 18,
        optOuts: 12,
        interested: 34,
        questions: 15,
      },
      conversionRate: 0.0157,
      responseRate: 0.0774,
      heatScore: 72,
    },
    {
      workflowId: "wf-followup-interested",
      name: "Interested Lead Follow-up",
      campaignContext: "follow_up",
      metrics: {
        totalSent: 450,
        delivered: 435,
        responses: 156,
        emailCaptures: 78,
        optOuts: 3,
        interested: 89,
        questions: 24,
      },
      conversionRate: 0.1793,
      responseRate: 0.3586,
      heatScore: 95,
    },
    {
      workflowId: "wf-nurture-long",
      name: "Long-term Nurture",
      campaignContext: "nurture",
      metrics: {
        totalSent: 800,
        delivered: 760,
        responses: 28,
        emailCaptures: 5,
        optOuts: 8,
        interested: 12,
        questions: 6,
      },
      conversionRate: 0.0066,
      responseRate: 0.0368,
      heatScore: 35,
    },
  ],
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  },
  aggregatedMetrics: {
    totalSent: 4950,
    totalDelivered: 4695,
    totalResponses: 460,
    totalEmailCaptures: 143,
    avgConversionRate: 0.0305,
    avgResponseRate: 0.098,
  },
};

function HeatCell({
  workflow,
  onClick,
}: {
  workflow: WorkflowMetrics;
  onClick?: () => void;
}) {
  const heatColor = getHeatColor(workflow.heatScore);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative p-4 rounded-lg border cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
              onClick && "cursor-pointer"
            )}
            style={{
              backgroundColor: `${heatColor}15`,
              borderColor: `${heatColor}40`,
            }}
            onClick={onClick}
          >
            {/* Heat Score Badge */}
            <div
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: heatColor }}
            >
              {workflow.heatScore}
            </div>

            {/* Workflow Name */}
            <div className="font-medium text-sm mb-2 pr-6">{workflow.name}</div>

            {/* Context Badge */}
            <Badge
              variant="outline"
              className="mb-3 text-xs"
              style={{ borderColor: heatColor, color: heatColor }}
            >
              {workflow.campaignContext}
            </Badge>

            {/* Key Metrics */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Email Captures</span>
                <span className="font-medium text-foreground">
                  {workflow.metrics.emailCaptures}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Response Rate</span>
                <span className="font-medium text-foreground">
                  {(workflow.responseRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Conversion</span>
                <span className="font-medium text-foreground">
                  {(workflow.conversionRate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64">
          <div className="space-y-2">
            <p className="font-medium">{workflow.name}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Sent:</span>{" "}
                {workflow.metrics.totalSent.toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">Delivered:</span>{" "}
                {workflow.metrics.delivered.toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">Responses:</span>{" "}
                {workflow.metrics.responses}
              </div>
              <div>
                <span className="text-muted-foreground">Opt-outs:</span>{" "}
                {workflow.metrics.optOuts}
              </div>
              <div>
                <span className="text-muted-foreground">Interested:</span>{" "}
                {workflow.metrics.interested}
              </div>
              <div>
                <span className="text-muted-foreground">Questions:</span>{" "}
                {workflow.metrics.questions}
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Heat Score: Higher = More email captures per message
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AggregatedMetricsBar({
  metrics,
}: {
  metrics: WorkflowHeatmapData["aggregatedMetrics"];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
          <MessageSquareIcon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Sent</p>
          <p className="font-semibold">{metrics.totalSent.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
          <ZapIcon className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Delivered</p>
          <p className="font-semibold">
            {metrics.totalDelivered.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
          <UsersIcon className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Responses</p>
          <p className="font-semibold">{metrics.totalResponses}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
          <MailIcon className="h-4 w-4 text-orange-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email Captures</p>
          <p className="font-semibold">{metrics.totalEmailCaptures}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
          <TrendingUpIcon className="h-4 w-4 text-teal-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Response Rate</p>
          <p className="font-semibold">
            {(metrics.avgResponseRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900">
          <FlameIcon className="h-4 w-4 text-rose-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Conversion</p>
          <p className="font-semibold">
            {(metrics.avgConversionRate * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

export function WorkflowHeatmap({
  data = MOCK_HEATMAP_DATA,
  onWorkflowClick,
  className,
}: WorkflowHeatmapProps) {
  // Sort workflows by heat score (highest first)
  const sortedWorkflows = useMemo(() => {
    return [...data.workflows].sort((a, b) => b.heatScore - a.heatScore);
  }, [data.workflows]);

  // Calculate date range display
  const dateRangeDisplay = useMemo(() => {
    const start = new Date(data.dateRange.start).toLocaleDateString();
    const end = new Date(data.dateRange.end).toLocaleDateString();
    return `${start} - ${end}`;
  }, [data.dateRange]);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlameIcon className="h-5 w-5 text-orange-500" />
              Workflow Heatmap
            </CardTitle>
            <CardDescription>
              High-impact workflow visualization for GIANNA prioritization
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {dateRangeDisplay}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Aggregated Metrics */}
        <AggregatedMetricsBar metrics={data.aggregatedMetrics} />

        {/* Heat Score Legend */}
        <div className="flex items-center gap-4 mb-6 text-xs">
          <span className="text-muted-foreground">Heat Score:</span>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "#ef4444" }}
            />
            <span>0-19</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "#f97316" }}
            />
            <span>20-39</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "#eab308" }}
            />
            <span>40-59</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "#84cc16" }}
            />
            <span>60-79</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "#22c55e" }}
            />
            <span>80-100</span>
          </div>
        </div>

        {/* Workflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedWorkflows.map((workflow) => (
            <HeatCell
              key={workflow.workflowId}
              workflow={workflow}
              onClick={
                onWorkflowClick
                  ? () => onWorkflowClick(workflow.workflowId)
                  : undefined
              }
            />
          ))}
        </div>

        {/* Top Performers */}
        {sortedWorkflows.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">
              Top Performing Workflows
            </h4>
            <div className="space-y-3">
              {sortedWorkflows.slice(0, 3).map((workflow, index) => (
                <div
                  key={workflow.workflowId}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      backgroundColor:
                        index === 0
                          ? "#22c55e"
                          : index === 1
                            ? "#84cc16"
                            : "#eab308",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {workflow.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {workflow.metrics.emailCaptures} captures
                      </span>
                    </div>
                    <Progress
                      value={workflow.heatScore}
                      className="h-1.5 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { MOCK_HEATMAP_DATA };
