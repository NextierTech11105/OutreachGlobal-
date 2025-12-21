"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";

interface NudgeStats {
  totalSent: number;
  delivered: number;
  opened: number;
  responded: number;
  converted: number;
  avgResponseTime: number;
}

export default function NudgeAnalyticsPage() {
  const [stats, setStats] = useState<NudgeStats>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    responded: 0,
    converted: 0,
    avgResponseTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/cathy/stats?range=${dateRange}`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalSent: data.totalSent ?? 0,
            delivered: data.delivered ?? 0,
            opened: data.opened ?? 0,
            responded: data.responded ?? 0,
            converted: data.converted ?? 0,
            avgResponseTime: data.avgResponseTime ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to load nudge stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [dateRange]);

  const deliveryRate =
    stats.totalSent > 0
      ? ((stats.delivered / stats.totalSent) * 100).toFixed(1)
      : "0";
  const openRate =
    stats.delivered > 0
      ? ((stats.opened / stats.delivered) * 100).toFixed(1)
      : "0";
  const responseRate =
    stats.opened > 0
      ? ((stats.responded / stats.opened) * 100).toFixed(1)
      : "0";
  const conversionRate =
    stats.responded > 0
      ? ((stats.converted / stats.responded) * 100).toFixed(1)
      : "0";

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CATHY Nudge Analytics</h1>
          <p className="text-muted-foreground">
            Track follow-up nudge performance and conversion rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange(dateRange)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Nudges Sent
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats.totalSent ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Follow-up messages sent by CATHY
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats.delivered ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {deliveryRate}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats.responded ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {responseRate}% response rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (stats.converted ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Nudge Performance Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">Sent</div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-blue-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: "100%" }}
                >
                  {(stats.totalSent ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">
                Delivered
              </div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-green-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: `${deliveryRate}%` }}
                >
                  {(stats.delivered ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">Opened</div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-yellow-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: `${openRate}%` }}
                >
                  {(stats.opened ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">
                Responded
              </div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-purple-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: `${responseRate}%` }}
                >
                  {(stats.responded ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground">
                Converted
              </div>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="bg-pink-500 h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                  style={{ width: `${conversionRate}%` }}
                >
                  {(stats.converted ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Response Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Average Response Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? "..." : `${stats.avgResponseTime ?? 0} min`}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Time between nudge sent and lead response
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
