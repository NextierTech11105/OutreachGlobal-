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

interface DigitalWorker {
  id: string;
  name: string;
  type: "sms" | "email" | "voice" | "multi-channel";
  status: "active" | "paused" | "idle";
  description: string;
  stats: {
    messagesHandled: number;
    messagesToday: number;
    conversionsToday: number;
    avgResponseTime: string;
    successRate: number;
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

  const toggleWorkerStatus = (workerId: string) => {
    setWorkers(
      workers.map((w) => {
        if (w.id === workerId) {
          return {
            ...w,
            status: w.status === "active" ? "paused" : "active",
          };
        }
        return w;
      })
    );
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
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
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
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
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
                        className={getStatusColor(worker.status) + " text-white"}
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
                    onCheckedChange={() => toggleWorkerStatus(worker.id)}
                  />
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
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
    </div>
  );
}
