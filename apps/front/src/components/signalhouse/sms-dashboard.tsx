"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Phone,
  TrendingUp,
  DollarSign,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Settings,
  Plus,
  Users,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
  Ban,
  Activity,
  Zap,
} from "lucide-react";

interface Analytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  failureRate: number;
  uniqueClicks: number;
  clickthroughRate: number;
}

interface Wallet {
  balance: number;
  currency: string;
}

interface PhoneNumber {
  phoneNumber: string;
  friendlyName?: string;
  status?: string;
  campaignId?: string;
}

interface Brand {
  brandId: string;
  brandName: string;
  status?: string;
}

interface Campaign {
  campaignId: string;
  usecase: string;
  brandId: string;
  status?: string;
}

interface MessageLog {
  messageId: string;
  to: string;
  from: string;
  status: string;
  direction?: string;
  segments?: number;
  createdAt?: string;
  message?: string;
}

interface SubGroup {
  subGroupId: string;
  name: string;
  description?: string;
  brandId?: string;
  campaignId?: string;
  phoneNumbers?: string[];
  createdAt?: string;
}

interface InboundOutboundStats {
  sent?: number;
  delivered?: number;
  failed?: number;
  received?: number;
  responded?: number;
}

export function SMSDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [outboundStats, setOutboundStats] =
    useState<InboundOutboundStats | null>(null);
  const [inboundStats, setInboundStats] = useState<InboundOutboundStats | null>(
    null,
  );
  const [optOutStats, setOptOutStats] = useState<Record<string, number> | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("overview");

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel - pulling EVERYTHING from SignalHouse
      const [
        analyticsRes,
        numbersRes,
        brandsRes,
        campaignsRes,
        logsRes,
        subGroupsRes,
        outboundRes,
        inboundRes,
        optOutRes,
      ] = await Promise.all([
        fetch("/api/signalhouse/analytics?type=dashboard"),
        fetch("/api/signalhouse/numbers"),
        fetch("/api/signalhouse/brand"),
        fetch("/api/signalhouse/campaign"),
        fetch("/api/signalhouse/message?action=logs&limit=50"),
        fetch("/api/signalhouse/subgroup"),
        fetch("/api/signalhouse/analytics?type=outbound"),
        fetch("/api/signalhouse/analytics?type=inbound"),
        fetch("/api/signalhouse/analytics?type=optout"),
      ]);

      const [
        analyticsData,
        numbersData,
        brandsData,
        campaignsData,
        logsData,
        subGroupsData,
        outboundData,
        inboundData,
        optOutData,
      ] = await Promise.all([
        analyticsRes.json(),
        numbersRes.json(),
        brandsRes.json(),
        campaignsRes.json(),
        logsRes.json(),
        subGroupsRes.json(),
        outboundRes.json(),
        inboundRes.json(),
        optOutRes.json(),
      ]);

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
        setWallet(analyticsData.wallet);
      }
      if (numbersData.success) setPhoneNumbers(numbersData.numbers || []);
      if (brandsData.success) setBrands(brandsData.brands || []);
      if (campaignsData.success) setCampaigns(campaignsData.campaigns || []);
      if (logsData.success) setMessageLogs(logsData.logs || []);
      if (subGroupsData.success) setSubGroups(subGroupsData.subGroups || []);
      if (outboundData.success) setOutboundStats(outboundData.data || null);
      if (inboundData.success) setInboundStats(inboundData.data || null);
      if (optOutData.success) setOptOutStats(optOutData.data || null);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const isSetupComplete =
    brands.length > 0 && campaigns.length > 0 && phoneNumbers.length > 0;

  if (!isSetupComplete && !loading) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Set Up SMS Messaging</CardTitle>
          <CardDescription>
            Complete the onboarding wizard to start sending SMS messages
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild size="lg">
            <a href="/t/default/settings/sms">
              <Plus className="h-4 w-4 mr-2" />
              Start Setup Wizard
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Enhanced with all SignalHouse data */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">
                  {analytics?.totalSent || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">
                  {analytics?.totalDelivered || 0}
                </p>
                <p className="text-xs text-green-600">
                  {analytics?.deliveryRate?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">
                  {analytics?.totalFailed || 0}
                </p>
                <p className="text-xs text-red-600">
                  {analytics?.failureRate?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inbound</p>
                <p className="text-2xl font-bold">
                  {inboundStats?.received || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Inbox className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opt-Outs</p>
                <p className="text-2xl font-bold">{optOutStats?.total || 0}</p>
              </div>
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Ban className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">
                  ${wallet?.balance?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview" className="gap-1">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              Message Logs
            </TabsTrigger>
            <TabsTrigger value="subgroups" className="gap-1">
              <Users className="h-4 w-4" />
              Sub-Groups
            </TabsTrigger>
            <TabsTrigger value="numbers" className="gap-1">
              <Phone className="h-4 w-4" />
              Numbers
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-1">
              <Zap className="h-4 w-4" />
              Brands
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* OVERVIEW TAB - Inbound/Outbound Analytics */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                  Outbound Analytics
                </CardTitle>
                <CardDescription>
                  Messages sent from your numbers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Total Sent</span>
                    <span className="font-bold text-lg">
                      {analytics?.totalSent || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="font-bold text-lg text-green-600">
                      {analytics?.totalDelivered || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-muted-foreground">Failed</span>
                    <span className="font-bold text-lg text-red-600">
                      {analytics?.totalFailed || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-muted-foreground">Click-through</span>
                    <span className="font-bold text-lg text-blue-600">
                      {analytics?.clickthroughRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5 text-purple-600" />
                  Inbound Analytics
                </CardTitle>
                <CardDescription>
                  Messages received on your numbers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">
                      Total Received
                    </span>
                    <span className="font-bold text-lg">
                      {inboundStats?.received || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-muted-foreground">Responded</span>
                    <span className="font-bold text-lg text-green-600">
                      {inboundStats?.responded || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-muted-foreground">Opt-Outs</span>
                    <span className="font-bold text-lg text-orange-600">
                      {optOutStats?.total || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-muted-foreground">Unique Clicks</span>
                    <span className="font-bold text-lg text-purple-600">
                      {analytics?.uniqueClicks || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MESSAGE LOGS TAB - Real SignalHouse logs */}
        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Message Logs</CardTitle>
                <CardDescription>
                  Live SMS history from SignalHouse (last 50 messages)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {messageLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">
                    Messages will appear here once you start sending
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Direction</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Segments</TableHead>
                        <TableHead>ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messageLogs.map((log) => (
                        <TableRow key={log.messageId}>
                          <TableCell>
                            {log.direction === "inbound" ? (
                              <Badge variant="secondary" className="gap-1">
                                <ArrowDownLeft className="h-3 w-3" />
                                In
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                Out
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.from}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.to}
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
                          <TableCell>{log.segments || 1}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.messageId?.slice(0, 8)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUB-GROUPS TAB - Multi-tenant management */}
        <TabsContent value="subgroups" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sub-Groups (Multi-Tenant)
                </CardTitle>
                <CardDescription>
                  Each sub-group isolates a customer&apos;s SMS infrastructure
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Sub-Group
              </Button>
            </CardHeader>
            <CardContent>
              {subGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sub-groups configured</p>
                  <p className="text-sm">
                    Create sub-groups to isolate customer SMS traffic
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subGroups.map((sg) => (
                    <div
                      key={sg.subGroupId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {sg.name?.slice(0, 2).toUpperCase() || "SG"}
                        </div>
                        <div>
                          <p className="font-semibold">{sg.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {sg.description || "No description"}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            ID: {sg.subGroupId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sg.phoneNumbers && sg.phoneNumbers.length > 0 && (
                          <Badge variant="secondary">
                            {sg.phoneNumbers.length} numbers
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PHONE NUMBERS TAB */}
        <TabsContent value="numbers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Phone Numbers</CardTitle>
                <CardDescription>
                  Your SMS-enabled phone numbers
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <a href="/t/default/settings/sms?tab=numbers">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Number
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {phoneNumbers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No phone numbers yet
                </p>
              ) : (
                <div className="space-y-3">
                  {phoneNumbers.map((num) => (
                    <div
                      key={num.phoneNumber}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-mono font-medium">
                            {num.phoneNumber}
                          </p>
                          {num.friendlyName && (
                            <p className="text-sm text-muted-foreground">
                              {num.friendlyName}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          num.status === "active" ? "default" : "secondary"
                        }
                      >
                        {num.status || "Active"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Registered Brands</CardTitle>
                <CardDescription>
                  Your 10DLC brand registrations
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <a href="/t/default/settings/sms">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Brand
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {brands.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No brands registered
                </p>
              ) : (
                <div className="space-y-3">
                  {brands.map((brand) => (
                    <div
                      key={brand.brandId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{brand.brandName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {brand.brandId}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          brand.status === "VERIFIED" ? "default" : "secondary"
                        }
                      >
                        {brand.status || "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SMS Campaigns</CardTitle>
                <CardDescription>
                  Your 10DLC campaign registrations
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <a href="/t/default/settings/sms">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No campaigns created
                </p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.campaignId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{campaign.usecase}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {campaign.campaignId}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          campaign.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {campaign.status || "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
