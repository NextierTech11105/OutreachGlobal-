"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MessageSquare,
  Send,
  Inbox,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Phone,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * SIGNALHOUSE DASHBOARD MAPPING
 * ═══════════════════════════════════════════════════════════════════════════════
 * Maps SignalHouse.io dashboards directly into Nextier
 *
 * Components:
 * - Balance & Account Status
 * - Messaging Stats (Outbound/Inbound SMS/MMS)
 * - Delivery Rate, Opt-Out Rate, Response Rate
 * - Campaign Status (Under Review, Rejected, Approved, Pending DCA)
 * - Messaging Insights & Per Number Delivery Rate
 * - Message Logs
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface SignalHouseStats {
  balance: number;
  outboundSMS: number;
  outboundMMS: number;
  inboundSMS: number;
  inboundMMS: number;
  deliveryRate: number;
  optOutRate: number;
  responseRate: number;
  failedCount: number;
  failureRate: number;
  uniqueClicks: number;
  clickthroughRate: number;
  avgMessagesPerDay: number;
  totalSegments: number;
}

interface CampaignStatus {
  campaignId: string;
  brandId: string;
  usecase: string;
  status:
    | "ACTIVE"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "UNDER_REVIEW"
    | "PENDING_DCA";
  description?: string;
  createdAt: string;
}

interface PhoneNumber {
  number: string;
  deliveryRate: number;
  messagesSent: number;
  lastUsed: string;
  status: "active" | "inactive" | "flagged";
}

interface MessageLog {
  id: string;
  to: string;
  from: string;
  direction: "outbound" | "inbound";
  message: string;
  status: "delivered" | "sent" | "failed" | "queued";
  sentAt: string;
  deliveredAt?: string;
  segments: number;
}

interface SignalHouseDashboardProps {
  dateRange?: "7" | "14" | "30" | "90";
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SignalHouseDashboard({
  dateRange = "7",
  autoRefresh = false,
  refreshInterval = 60000,
}: SignalHouseDashboardProps) {
  const [stats, setStats] = useState<SignalHouseStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [statsRes, campaignsRes, numbersRes, logsRes] = await Promise.all([
        fetch(`/api/signalhouse/analytics?days=${selectedDateRange}`),
        fetch("/api/signalhouse/campaign"),
        fetch("/api/signalhouse/numbers"),
        fetch(`/api/signalhouse/logs?limit=50`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || statsData);
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
      }

      if (numbersRes.ok) {
        const numbersData = await numbersRes.json();
        setPhoneNumbers(numbersData.numbers || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setMessageLogs(logsData.logs || []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError("Failed to fetch SignalHouse data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDateRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusBadge = (status: CampaignStatus["status"]) => {
    const variants: Record<string, { class: string; label: string }> = {
      ACTIVE: { class: "bg-green-600", label: "Active" },
      APPROVED: { class: "bg-green-500", label: "Approved" },
      PENDING: { class: "bg-yellow-500", label: "Pending" },
      PENDING_DCA: { class: "bg-yellow-600", label: "Pending DCA" },
      UNDER_REVIEW: { class: "bg-blue-500", label: "Under Review" },
      REJECTED: { class: "bg-red-500", label: "Rejected" },
    };
    const v = variants[status] || { class: "bg-gray-500", label: status };
    return <Badge className={v.class}>{v.label}</Badge>;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="font-medium mb-2">
              Failed to Load SignalHouse Data
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SignalHouse Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedDateRange}
            onValueChange={(v) => setSelectedDateRange(v as any)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.balance?.toFixed(2) || "0.00"} USD
            </div>
          </CardContent>
        </Card>

        {/* Outbound */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outbound</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.outboundSMS?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              SMS • {stats?.outboundMMS?.toLocaleString() || 0} MMS
            </p>
          </CardContent>
        </Card>

        {/* Inbound */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inbound</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.inboundSMS?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              SMS • {stats?.inboundMMS?.toLocaleString() || 0} MMS
            </p>
          </CardContent>
        </Card>

        {/* Delivery Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.deliveryRate?.toFixed(1) || 0}%
            </div>
            <Progress value={stats?.deliveryRate || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Opt-Out Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600">
              {stats?.optOutRate?.toFixed(2) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {stats?.responseRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">
              {stats?.failedCount?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.failureRate?.toFixed(2) || 0}% failure rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
          <TabsTrigger value="logs">Message Logs</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>10DLC Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No campaigns found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign ID</TableHead>
                      <TableHead>Brand ID</TableHead>
                      <TableHead>Use Case</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.campaignId}>
                        <TableCell className="font-mono text-sm">
                          {campaign.campaignId}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {campaign.brandId}
                        </TableCell>
                        <TableCell>{campaign.usecase}</TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phone Numbers Tab */}
        <TabsContent value="numbers">
          <Card>
            <CardHeader>
              <CardTitle>Phone Number Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {phoneNumbers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No phone numbers found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Delivery Rate</TableHead>
                      <TableHead>Messages Sent</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phoneNumbers.map((num) => (
                      <TableRow key={num.number}>
                        <TableCell className="font-mono">
                          {num.number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={num.deliveryRate}
                              className="h-2 w-20"
                            />
                            <span className="text-sm">
                              {num.deliveryRate.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {num.messagesSent.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(num.lastUsed).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              num.status === "active"
                                ? "default"
                                : num.status === "flagged"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {num.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {messageLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No message logs found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Direction</TableHead>
                      <TableHead>To/From</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messageLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.direction === "outbound" ? (
                            <Send className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Inbox className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.direction === "outbound" ? log.to : log.from}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm">
                          {log.message}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "delivered"
                                ? "default"
                                : log.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.sentAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
