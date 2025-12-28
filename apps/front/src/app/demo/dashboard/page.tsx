"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  Users,
  MessageSquare,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  Sparkles,
  Eye,
  Lock,
  LogOut,
  Star,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  generateDemoStats,
  generateDemoLeads,
  isDemoSession,
  disableDemoMode,
  type DemoStats,
  type DemoLead,
} from "@/lib/demo/demo-data";
import { PersonaAvatar } from "@/components/onboarding/persona-avatar";

/**
 * DEMO DASHBOARD
 * ═══════════════════════════════════════════════════════════════════════════════
 * Read-only dashboard with simulated data showing "The Machine" in steady state
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export default function DemoDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [leads, setLeads] = useState<DemoLead[]>([]);

  useEffect(() => {
    // Check demo mode
    if (!isDemoSession()) {
      router.push("/demo");
      return;
    }

    // Generate demo data
    setStats(generateDemoStats());
    setLeads(generateDemoLeads(50));
  }, [router]);

  const handleExitDemo = () => {
    disableDemoMode();
    router.push("/demo");
  };

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading demo data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 py-2 px-4">
        <div className="container max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-800 dark:text-yellow-200">
              Demo Mode
            </span>
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Read Only
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitDemo}
            className="text-yellow-800 dark:text-yellow-200"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Exit Demo
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">The Machine Dashboard</h1>
          <p className="text-muted-foreground">
            20,000 leads in play - Stabilized and running
          </p>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Leads in Play
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalLeadsInPlay.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-600" />+
                {stats.monthlyNetGrowth.toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                SMS Sent (Month)
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalSMSSent.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(stats.totalSMSSent / 30).toLocaleString()}/day avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Response Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.overallResponseRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalResponses.toLocaleString()} responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                SignalHouse Balance
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.signalHouse.balance.toFixed(2)}
              </div>
              <Badge variant="default" className="bg-green-600 text-xs mt-1">
                {stats.signalHouse.campaignStatus}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaign Blocks</TabsTrigger>
            <TabsTrigger value="stages">SMS Stages</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="signalhouse">SignalHouse</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Tier Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Tier Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(["A", "B", "C", "D"] as const).map((tier) => {
                    const data = stats.tierBreakdown[tier];
                    const percent = (data.count / stats.totalLeadsInPlay) * 100;
                    return (
                      <div key={tier} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {tier === "A" && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                            Tier {tier}
                          </span>
                          <span>
                            {data.count.toLocaleString()} ({data.responseRate}%
                            response)
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* AI Worker Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Worker Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(["GIANNA", "CATHY", "SABRINA"] as const).map((worker) => {
                    const data = stats.workerStats[worker];
                    return (
                      <div
                        key={worker}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <PersonaAvatar
                          persona={worker}
                          size="sm"
                          showName
                          showRole
                        />
                        <div className="text-right">
                          <div className="font-medium">
                            {data.sent.toLocaleString()} sent
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {data.rate}% response
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Flow */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Lead Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <ArrowUpRight className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      +{stats.monthlyNewLeads.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      New Leads
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <ArrowDownRight className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">
                      -{stats.monthlyChurnedLeads.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Churned/Converted
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      +{stats.monthlyNetGrowth.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Net Growth
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaign Blocks Tab */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Last 10 Campaign Blocks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Tier A</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Gold</TableHead>
                      <TableHead>Meetings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.campaignBlocks.map((block) => (
                      <TableRow key={block.day}>
                        <TableCell className="font-medium">
                          Day {block.day}
                        </TableCell>
                        <TableCell>{block.date.toLocaleDateString()}</TableCell>
                        <TableCell>{block.leadsProcessed}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-600">
                            {block.tierBreakdown.A}
                          </Badge>
                        </TableCell>
                        <TableCell>{block.delivered}</TableCell>
                        <TableCell>{block.responses}</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">
                            {block.responseRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{block.goldLabels}</Badge>
                        </TableCell>
                        <TableCell>{block.meetingsBooked}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Stages Tab */}
          <TabsContent value="stages">
            <Card>
              <CardHeader>
                <CardTitle>SMS Stage Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(stats.stageBreakdown).map(
                      ([stage, data]) => {
                        const worker =
                          stage.startsWith("initial") ||
                          stage.startsWith("retarget")
                            ? "GIANNA"
                            : stage.startsWith("follow")
                              ? "CATHY"
                              : "SABRINA";
                        return (
                          <TableRow key={stage}>
                            <TableCell className="font-medium">
                              {stage.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell>
                              <PersonaAvatar persona={worker} size="sm" />
                            </TableCell>
                            <TableCell>{data.sent.toLocaleString()}</TableCell>
                            <TableCell>
                              {data.delivered.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {data.responses.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`font-medium ${
                                  data.rate >= 20
                                    ? "text-green-600"
                                    : data.rate >= 10
                                      ? "text-blue-600"
                                      : "text-yellow-600"
                                }`}
                              >
                                {data.rate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      },
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Sample Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Last Stage</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.slice(0, 20).map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell>{lead.company}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lead.status === "interested" ||
                              lead.status === "meeting_booked"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {lead.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              lead.tier === "A"
                                ? "border-green-600 text-green-600"
                                : lead.tier === "B"
                                  ? "border-blue-600 text-blue-600"
                                  : ""
                            }
                          >
                            {lead.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.lastStage.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          {lead.isGoldLabel && (
                            <Badge className="bg-yellow-500 mr-1">GOLD</Badge>
                          )}
                          {lead.isGreenTag && (
                            <Badge className="bg-green-500">GREEN</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SignalHouse Tab */}
          <TabsContent value="signalhouse">
            <Card>
              <CardHeader>
                <CardTitle>SignalHouse.io Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Balance
                    </div>
                    <div className="text-2xl font-bold">
                      ${stats.signalHouse.balance.toFixed(2)} USD
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Outbound SMS
                    </div>
                    <div className="text-2xl font-bold">
                      {stats.signalHouse.outboundSMS.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Inbound SMS
                    </div>
                    <div className="text-2xl font-bold">
                      {stats.signalHouse.inboundSMS.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Delivery Rate
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.signalHouse.deliveryRate}%
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Opt-Out Rate
                    </div>
                    <div className="text-xl font-bold text-yellow-600">
                      {stats.signalHouse.optOutRate}%
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Response Rate
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {stats.signalHouse.responseRate}%
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      Campaign Status
                    </div>
                    <Badge className="bg-green-600 text-lg px-3 py-1">
                      {stats.signalHouse.campaignStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
