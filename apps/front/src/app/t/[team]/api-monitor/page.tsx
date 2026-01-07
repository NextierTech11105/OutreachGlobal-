"use client";

import { useState } from "react";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Globe,
  Database,
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
import { Progress } from "@/components/ui/progress";

interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
  uptime: number;
  requests24h: number;
  errors24h: number;
  lastChecked: string;
}

export default function ApiMonitorPage() {
  const [endpoints] = useState<ApiEndpoint[]>([
    {
      id: "1",
      name: "Core API",
      url: "api.nextier.com/v1",
      status: "healthy",
      latency: 45,
      uptime: 99.99,
      requests24h: 125000,
      errors24h: 12,
      lastChecked: "Just now",
    },
    {
      id: "2",
      name: "SignalHouse SMS",
      url: "signalhouse.io/api",
      status: "healthy",
      latency: 120,
      uptime: 99.95,
      requests24h: 45000,
      errors24h: 5,
      lastChecked: "1 min ago",
    },
    {
      id: "3",
      name: "OpenAI",
      url: "api.openai.com/v1",
      status: "healthy",
      latency: 890,
      uptime: 99.9,
      requests24h: 8500,
      errors24h: 23,
      lastChecked: "2 min ago",
    },
    {
      id: "4",
      name: "Perplexity AI",
      url: "api.perplexity.ai",
      status: "degraded",
      latency: 2500,
      uptime: 98.5,
      requests24h: 3200,
      errors24h: 156,
      lastChecked: "1 min ago",
    },
    {
      id: "5",
      name: "Database",
      url: "PostgreSQL",
      status: "healthy",
      latency: 12,
      uptime: 99.99,
      requests24h: 500000,
      errors24h: 0,
      lastChecked: "Just now",
    },
    {
      id: "6",
      name: "Redis Cache",
      url: "Redis",
      status: "healthy",
      latency: 2,
      uptime: 99.99,
      requests24h: 1200000,
      errors24h: 0,
      lastChecked: "Just now",
    },
  ]);

  const getStatusIcon = (status: ApiEndpoint["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "down":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: ApiEndpoint["status"]) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "down":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return "text-green-600";
    if (latency < 500) return "text-yellow-600";
    return "text-red-600";
  };

  const healthyCount = endpoints.filter((e) => e.status === "healthy").length;
  const totalRequests = endpoints.reduce((sum, e) => sum + e.requests24h, 0);
  const totalErrors = endpoints.reduce((sum, e) => sum + e.errors24h, 0);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Monitor</h1>
          <p className="text-muted-foreground">
            System health and API performance
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {/* Overall Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${healthyCount === endpoints.length ? "bg-green-500" : "bg-yellow-500"}`}
              />
              <span className="text-2xl font-bold">
                {healthyCount === endpoints.length ? "Operational" : "Degraded"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthyCount}/{endpoints.length} services healthy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Requests (24h)
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalRequests / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground">
              across all endpoints
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((totalErrors / totalRequests) * 100).toFixed(3)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {totalErrors} errors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                endpoints.reduce((sum, e) => sum + e.latency, 0) /
                  endpoints.length,
              )}
              ms
            </div>
            <p className="text-xs text-muted-foreground">
              average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints */}
      <div className="grid gap-4">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(endpoint.status)}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {endpoint.name}
                      <Badge
                        className={
                          getStatusColor(endpoint.status) + " text-white"
                        }
                      >
                        {endpoint.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {endpoint.url}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div
                      className={`text-lg font-semibold ${getLatencyColor(endpoint.latency)}`}
                    >
                      {endpoint.latency}ms
                    </div>
                    <div className="text-xs text-muted-foreground">latency</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {endpoint.uptime}%
                    </div>
                    <div className="text-xs text-muted-foreground">uptime</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {endpoint.requests24h.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      requests
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-semibold ${endpoint.errors24h > 100 ? "text-red-600" : ""}`}
                    >
                      {endpoint.errors24h}
                    </div>
                    <div className="text-xs text-muted-foreground">errors</div>
                  </div>
                  <div className="text-sm text-muted-foreground w-24 text-right">
                    {endpoint.lastChecked}
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
