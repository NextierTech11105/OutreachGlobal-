"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  MessageSquare,
  Phone,
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSDRStream, type SDRActivity } from "@/hooks/use-sdr-stream";
import { AgentActivityFeed } from "@/components/sdr/agent-activity-feed";
import { ApprovalQueue } from "@/components/sdr/approval-queue";
import { AgentStatusBar } from "@/components/sdr/agent-status-bar";

// Agent config
const AGENTS = [
  {
    id: "GIANNA",
    name: "GIANNA",
    role: "Opener",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    id: "CATHY",
    name: "CATHY",
    role: "Nurture",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    id: "SABRINA",
    name: "SABRINA",
    role: "Closer",
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    id: "LUCI",
    name: "LUCI",
    role: "Research",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "COPILOT",
    name: "COPILOT",
    role: "Router",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
];

export default function SDRConsolePage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const {
    connected,
    activities,
    pendingApprovals,
    error,
    batchApprove,
    batchReject,
    clearError,
    reconnect,
  } = useSDRStream({
    onActivity: (activity) => {
      if (activity.requiresApproval && activity.status === "pending") {
        toast.info(`New approval needed from ${activity.agent}`, {
          description: `Action: ${activity.action}`,
        });
      }
    },
  });

  // Filter activities by selected agent
  const filteredActivities = selectedAgent
    ? activities.filter((a) => a.agent === selectedAgent)
    : activities;

  const filteredApprovals = selectedAgent
    ? pendingApprovals.filter((a) => a.agent === selectedAgent)
    : pendingApprovals;

  // Handle batch approve
  const handleBatchApprove = async () => {
    if (selectedActivities.length === 0) {
      toast.error("No activities selected");
      return;
    }

    try {
      await batchApprove(selectedActivities);
      toast.success(`Approved ${selectedActivities.length} activities`);
      setSelectedActivities([]);
    } catch {
      toast.error("Failed to approve activities");
    }
  };

  // Handle batch reject
  const handleBatchReject = async (reason: string) => {
    if (selectedActivities.length === 0) {
      toast.error("No activities selected");
      return;
    }

    try {
      await batchReject(selectedActivities, reason);
      toast.success(`Rejected ${selectedActivities.length} activities`);
      setSelectedActivities([]);
    } catch {
      toast.error("Failed to reject activities");
    }
  };

  // Toggle activity selection
  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  // Select all pending approvals
  const selectAllPending = () => {
    setSelectedActivities(filteredApprovals.map((a) => a.id));
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SDR Console</h1>
          <p className="text-muted-foreground">
            Real-time agent activity and approvals
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <Badge
            variant={connected ? "default" : "destructive"}
            className="gap-1"
          >
            {connected ? (
              <>
                <Zap className="h-3 w-3" />
                Live
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Disconnected
              </>
            )}
          </Badge>

          {!connected && (
            <Button size="sm" variant="outline" onClick={reconnect}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={clearError}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agent Status Bar */}
      <AgentStatusBar
        agents={AGENTS}
        activities={activities}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approval Queue - Takes priority */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Approval Queue
                  {filteredApprovals.length > 0 && (
                    <Badge variant="destructive">
                      {filteredApprovals.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Items requiring your review
                </CardDescription>
              </div>

              {/* Batch actions */}
              <div className="flex items-center gap-2">
                {filteredApprovals.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllPending}
                  >
                    Select All ({filteredApprovals.length})
                  </Button>
                )}

                {selectedActivities.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleBatchApprove}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve ({selectedActivities.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBatchReject("needs_human_touch")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ApprovalQueue
                approvals={filteredApprovals}
                selectedIds={selectedActivities}
                onToggleSelect={toggleActivity}
                onApprove={async (id) => {
                  await batchApprove([id]);
                  toast.success("Approved");
                }}
                onReject={async (id, reason) => {
                  await batchReject([id], reason);
                  toast.success("Rejected");
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Activity Feed
              </CardTitle>
              <CardDescription>
                Recent agent actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentActivityFeed activities={filteredActivities.slice(0, 20)} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter((a) => a.status === "approved").length}
                </p>
                <p className="text-sm text-muted-foreground">Approved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter((a) => a.status === "auto_sent").length}
                </p>
                <p className="text-sm text-muted-foreground">Auto-Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter((a) => a.status === "rejected").length}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
