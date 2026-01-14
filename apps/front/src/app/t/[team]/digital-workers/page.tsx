"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Settings,
  Activity,
  Zap,
  MessageSquare,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  Database,
  Search,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DigitalWorker {
  id: string;
  name: string;
  type:
    | "sms"
    | "email"
    | "voice"
    | "multi-channel"
    | "data"
    | "research"
    | "scheduler";
  status: "active" | "paused" | "idle";
  description: string;
  stats: {
    messagesHandled: number;
    messagesToday: number;
    conversionsToday: number;
    avgResponseTime: string;
    successRate: number;
  };
  // Worker-specific stats
  dataStats?: {
    recordsScanned: number;
    leadsEnriched: number;
    listsGenerated: number;
    batchesPrepped: number;
  };
  researchStats?: {
    reportsGenerated: number;
    deepDives: number;
    briefingsCreated: number;
    contextPackages: number;
  };
  schedulerStats?: {
    meetingsMonitored: number;
    remindersSent: number;
    confirmationsReceived: number;
    noShowsRecovered: number;
  };
}

interface Summary {
  totalMessages: number;
  totalToday: number;
  totalConversions: number;
  avgSuccessRate: number;
  activeWorkers: number;
}

export default function DigitalWorkersPage() {
  const [workers, setWorkers] = useState<DigitalWorker[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<DigitalWorker | null>(
    null,
  );

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/digital-workers/stats");
      if (res.ok) {
        const data = await res.json();
        setWorkers(data.workers || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Failed to fetch digital workers stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const toggleWorkerStatus = async (workerId: string) => {
    setTogglingIds((prev) => new Set(prev).add(workerId));

    // Optimistic update
    const currentWorker = workers.find((w) => w.id === workerId);
    const newStatus = currentWorker?.status === "active" ? "paused" : "active";

    setWorkers(
      workers.map((w) => {
        if (w.id === workerId) {
          return { ...w, status: newStatus };
        }
        return w;
      }),
    );

    try {
      const res = await fetch("/api/digital-workers/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle worker");
      }

      const data = await res.json();
      toast.success(
        `${currentWorker?.name} is now ${data.status === "active" ? "active" : "paused"}`,
      );
    } catch (error) {
      // Revert on error
      setWorkers(
        workers.map((w) => {
          if (w.id === workerId) {
            return { ...w, status: currentWorker?.status || "idle" };
          }
          return w;
        }),
      );
      toast.error("Failed to toggle worker status");
    } finally {
      setTogglingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(workerId);
        return newSet;
      });
    }
  };

  const openSettings = (worker: DigitalWorker) => {
    setSelectedWorker(worker);
    setSettingsOpen(true);
  };

  const getTypeIcon = (type: DigitalWorker["type"]) => {
    switch (type) {
      case "sms":
        return <MessageSquare className="h-5 w-5" />;
      case "voice":
        return <Phone className="h-5 w-5" />;
      case "email":
        return <Mail className="h-5 w-5" />;
      case "multi-channel":
        return <Zap className="h-5 w-5" />;
      case "data":
        return <Database className="h-5 w-5" />;
      case "research":
        return <Search className="h-5 w-5" />;
      case "scheduler":
        return <Calendar className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: DigitalWorker["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "idle":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Digital Workers</h1>
          <p className="text-muted-foreground">
            AI-powered sales development representatives
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Workers
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.activeWorkers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {workers.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.totalMessages || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(summary?.totalToday || 0).toLocaleString()} today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalConversions || 0}
            </div>
            <p className="text-xs text-muted-foreground">replies & bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Success Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.avgSuccessRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">across all workers</p>
          </CardContent>
        </Card>
      </div>

      {/* Workers List */}
      <div className="grid gap-4">
        {workers.map((worker) => (
          <Card key={worker.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-full ${getStatusColor(worker.status)} bg-opacity-20`}
                  >
                    {getTypeIcon(worker.type)}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {worker.name}
                      <Badge
                        variant="outline"
                        className={
                          getStatusColor(worker.status) + " text-white"
                        }
                      >
                        {worker.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{worker.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={worker.status === "active"}
                    disabled={togglingIds.has(worker.id)}
                    onCheckedChange={() => toggleWorkerStatus(worker.id)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSettings(worker)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Messages
                  </p>
                  <p className="text-lg font-semibold">
                    {worker.stats.messagesHandled.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-lg font-semibold">
                    {worker.stats.messagesToday.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-lg font-semibold">
                    {worker.stats.conversionsToday}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={worker.stats.successRate}
                      className="h-2 flex-1"
                    />
                    <span className="text-sm font-medium">
                      {worker.stats.successRate}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedWorker?.name} Settings</DialogTitle>
            <DialogDescription>
              Configure {selectedWorker?.name}'s behavior and parameters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedWorker?.status}
                onValueChange={(value) => {
                  if (selectedWorker) {
                    toggleWorkerStatus(selectedWorker.id);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Worker Type</Label>
              <div className="text-sm text-muted-foreground capitalize">
                {selectedWorker?.type?.replace("-", " ")}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <div className="text-sm text-muted-foreground">
                {selectedWorker?.description}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Performance</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Messages: </span>
                  <span className="font-medium">
                    {selectedWorker?.stats.messagesHandled.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Success: </span>
                  <span className="font-medium">
                    {selectedWorker?.stats.successRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
