"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Bot,
  Play,
  Pause,
  Settings,
  Activity,
  Zap,
  MessageSquare,
  Phone,
  Mail,
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
  status: "active" | "paused" | "training";
  description: string;
  stats: {
    messagesHandled: number;
    conversionsToday: number;
    avgResponseTime: string;
    successRate: number;
  };
}

const digitalWorkers: DigitalWorker[] = [
  {
    id: "gianna",
    name: "Gianna",
    type: "sms",
    status: "active",
    description:
      "AI SDR specializing in initial outreach and qualification via SMS",
    stats: {
      messagesHandled: 1247,
      conversionsToday: 23,
      avgResponseTime: "2.3s",
      successRate: 78,
    },
  },
  {
    id: "cathy",
    name: "Cathy",
    type: "voice",
    status: "active",
    description: "Voice AI for appointment scheduling and follow-up calls",
    stats: {
      messagesHandled: 342,
      conversionsToday: 12,
      avgResponseTime: "1.8s",
      successRate: 82,
    },
  },
  {
    id: "sabrina",
    name: "Sabrina",
    type: "multi-channel",
    status: "paused",
    description: "Multi-channel nurture sequences for engaged leads",
    stats: {
      messagesHandled: 856,
      conversionsToday: 8,
      avgResponseTime: "3.1s",
      successRate: 71,
    },
  },
];

export default function DigitalWorkersPage() {
  const params = useParams<{ team: string }>();
  const [workers, setWorkers] = useState<DigitalWorker[]>(digitalWorkers);

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
      }),
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
      case "training":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Digital Workers</h1>
          <p className="text-muted-foreground">
            Manage your AI-powered sales development representatives
          </p>
        </div>
        <Button>
          <Bot className="mr-2 h-4 w-4" />
          Add Worker
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
              {workers.filter((w) => w.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {workers.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Today
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workers
                .reduce((sum, w) => sum + w.stats.messagesHandled, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workers.reduce((sum, w) => sum + w.stats.conversionsToday, 0)}
            </div>
            <p className="text-xs text-muted-foreground">appointments booked</p>
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
              {Math.round(
                workers.reduce((sum, w) => sum + w.stats.successRate, 0) /
                  workers.length,
              )}
              %
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
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-lg font-semibold">
                    {worker.stats.messagesHandled.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-lg font-semibold">
                    {worker.stats.conversionsToday}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-lg font-semibold">
                    {worker.stats.avgResponseTime}
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
