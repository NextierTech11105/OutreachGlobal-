"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  BarChart3,
  Activity,
  Users,
  MessageSquare,
  Phone,
  Calendar,
  Loader2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportStats {
  leads: {
    total: number;
    last30Days: number;
    growthPercent: number;
    smsReady: number;
    enriched: number;
    avgScore: number;
  };
  sms: {
    total: number;
    last30Days: number;
    delivered: number;
    replies: number;
    deliveryRate: number;
    replyRate: number;
  };
  calls: {
    total: number;
    last30Days: number;
    completed: number;
    answered: number;
    answerRate: number;
  };
  appointments: {
    total: number;
    last30Days: number;
    upcoming: number;
  };
  conversion: {
    rate: number;
    totalOutreach: number;
    totalConversions: number;
  };
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("30d");
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/reports/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-muted-foreground">—</span>;
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-1 text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? "+" : ""}{value}%
      </span>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.leads.total.toLocaleString() || 0}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                +{stats?.leads.last30Days || 0} last 30 days
              </p>
              <GrowthIndicator value={stats?.leads.growthPercent || 0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.sms.total.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.sms.deliveryRate || 0}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversion.rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.conversion.totalConversions || 0} of {stats?.conversion.totalOutreach || 0} outreach
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.appointments.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.appointments.upcoming || 0} upcoming
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Lead Quality */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Lead Quality</CardTitle>
                <CardDescription>Enrichment and scoring stats</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SMS Ready</span>
                <span className="font-medium">{stats?.leads.smsReady.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enriched</span>
                <span className="font-medium">{stats?.leads.enriched.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Score</span>
                <span className="font-medium">{stats?.leads.avgScore || 0}/100</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">SMS Performance</CardTitle>
                <CardDescription>Delivery and engagement</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivered</span>
                <span className="font-medium">{stats?.sms.delivered.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Replies</span>
                <span className="font-medium">{stats?.sms.replies.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reply Rate</span>
                <span className="font-medium">{stats?.sms.replyRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Call Performance</CardTitle>
                <CardDescription>Voice outreach metrics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Calls</span>
                <span className="font-medium">{stats?.calls.total.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Answered</span>
                <span className="font-medium">{stats?.calls.answered.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Answer Rate</span>
                <span className="font-medium">{stats?.calls.answerRate || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state if no data */}
      {stats && stats.leads.total === 0 && stats.sms.total === 0 && stats.calls.total === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No activity yet</h3>
            <p className="text-muted-foreground text-center mt-1 max-w-md">
              Start importing leads and sending outreach to see your performance metrics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
