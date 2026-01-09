"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down" | "not_configured";
  latency: number;
  message?: string;
}

interface SystemStatus {
  status: "operational" | "degraded" | "down";
  timestamp: string;
  responseTime: number;
  services: ServiceStatus[];
  summary: {
    healthy: number;
    total: number;
    avgLatency: number;
  };
}

export default function ApiMonitorPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSystemStatus(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "down":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "not_configured":
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500 text-white">Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-500 text-white">Degraded</Badge>;
      case "down":
        return <Badge className="bg-red-500 text-white">Down</Badge>;
      case "not_configured":
        return <Badge variant="secondary">Not Configured</Badge>;
      default:
        return null;
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency === 0) return "text-gray-400";
    if (latency < 200) return "text-green-600";
    if (latency < 1000) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading && !systemStatus) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !systemStatus) {
    return (
      <div className="flex-1 p-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="font-medium">Failed to load system status</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={fetchStatus} className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Monitor</h1>
          <p className="text-muted-foreground">
            Real-time system health and API status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  systemStatus?.status === "operational"
                    ? "bg-green-500"
                    : systemStatus?.status === "degraded"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-2xl font-bold capitalize">
                {systemStatus?.status || "Unknown"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStatus?.summary.healthy}/{systemStatus?.summary.total} services healthy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getLatencyColor(systemStatus?.summary.avgLatency || 0)}`}>
              {systemStatus?.summary.avgLatency || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              average response time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus?.responseTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              health check duration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Services</h2>
        {systemStatus?.services.map((service) => (
          <Card key={service.name}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {service.name}
                      {getStatusBadge(service.status)}
                    </div>
                    {service.message && (
                      <div className="text-sm text-muted-foreground">
                        {service.message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getLatencyColor(service.latency)}`}>
                    {service.latency > 0 ? `${service.latency}ms` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">latency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
