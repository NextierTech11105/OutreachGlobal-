"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Download, Filter, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface CampaignAnalyticsDashboardProps {
  campaignId?: string;
}

export function CampaignAnalyticsDashboard({
  campaignId,
}: CampaignAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data for the analytics
  const overviewData = {
    totalCalls: 1247,
    connectedCalls: 843,
    avgCallDuration: "3:42",
    conversionRate: 18,
    callsToday: 124,
    callsYesterday: 118,
    callsThisWeek: 842,
    callsLastWeek: 782,
  };

  const dispositionData = [
    { name: "Interested", value: 215 },
    { name: "Not Interested", value: 312 },
    { name: "Call Back", value: 187 },
    { name: "Voicemail", value: 398 },
    { name: "Wrong Number", value: 78 },
    { name: "Do Not Call", value: 57 },
  ];

  const callsByDayData = [
    { day: "Mon", calls: 178, connected: 121, duration: 3.8 },
    { day: "Tue", calls: 192, connected: 134, duration: 4.2 },
    { day: "Wed", calls: 201, connected: 142, duration: 3.9 },
    { day: "Thu", calls: 187, connected: 128, duration: 3.6 },
    { day: "Fri", calls: 168, connected: 112, duration: 3.5 },
    { day: "Sat", calls: 84, connected: 52, duration: 3.1 },
    { day: "Sun", calls: 42, connected: 28, duration: 2.8 },
  ];

  const agentPerformanceData = [
    {
      id: "agent-1",
      name: "Sarah Johnson",
      avatar: "/stylized-letters-sj.png",
      calls: 342,
      connected: 248,
      avgDuration: "4:12",
      conversions: 52,
      conversionRate: 21,
    },
    {
      id: "agent-2",
      name: "Michael Chen",
      avatar: "/abstract-geometric-mg.png",
      calls: 298,
      connected: 201,
      avgDuration: "3:48",
      conversions: 43,
      conversionRate: 21.4,
    },
    {
      id: "agent-3",
      name: "Emily Davis",
      avatar: "/abstract-rj.png",
      calls: 312,
      connected: 218,
      avgDuration: "3:56",
      conversions: 38,
      conversionRate: 17.4,
    },
    {
      id: "agent-4",
      name: "David Wilson",
      avatar: "/abstract-geometric-DR.png",
      calls: 295,
      connected: 176,
      avgDuration: "3:22",
      conversions: 31,
      conversionRate: 17.6,
    },
  ];

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#FF6B6B",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campaign Analytics</h2>
        <div className="flex items-center gap-2">
          <Select
            defaultValue="7d"
            value={dateRange}
            onValueChange={setDateRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dispositions">Dispositions</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="calls">Call Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewData.totalCalls}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(
                    (overviewData.callsThisWeek / overviewData.callsLastWeek -
                      1) *
                      100,
                  )}
                  % from previous period
                </div>
                <Progress
                  value={
                    (overviewData.connectedCalls / overviewData.totalCalls) *
                    100
                  }
                  className="h-1 mt-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>
                    {Math.round(
                      (overviewData.connectedCalls / overviewData.totalCalls) *
                        100,
                    )}
                    % connected
                  </span>
                  <span>{overviewData.connectedCalls} calls</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Call Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewData.avgCallDuration}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  -0:12 from previous period
                </div>
                <div className="h-[40px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={callsByDayData}
                      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                    >
                      <Bar
                        dataKey="duration"
                        fill="#8884d8"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewData.conversionRate}%
                </div>
                <div className="text-xs text-green-600 mt-1">
                  +2.4% from previous period
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Target</span>
                    <span>20%</span>
                  </div>
                  <Progress
                    value={(overviewData.conversionRate / 20) * 100}
                    className="h-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Calls Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewData.callsToday}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  +{overviewData.callsToday - overviewData.callsYesterday} from
                  yesterday
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="text-xs font-medium">
                    {Math.round((overviewData.callsToday / 200) * 100)}%
                  </div>
                </div>
                <Progress
                  value={(overviewData.callsToday / 200) * 100}
                  className="h-1 mt-1"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Call Volume by Day</CardTitle>
                <CardDescription>
                  Number of calls and connection rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={callsByDayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="calls" fill="#8884d8" name="Total Calls" />
                      <Bar
                        dataKey="connected"
                        fill="#82ca9d"
                        name="Connected Calls"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call Dispositions</CardTitle>
                <CardDescription>Breakdown of call outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dispositionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dispositionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dispositions" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Disposition Breakdown</CardTitle>
                <CardDescription>
                  Call outcomes by disposition type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dispositionData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }) =>
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dispositionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Disposition Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of call outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dispositionData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          ></div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-sm">{item.value} calls</div>
                      </div>
                      <Progress
                        value={(item.value / overviewData.totalCalls) * 100}
                        className="h-2"
                        style={{
                          backgroundColor: `${COLORS[index % COLORS.length]}20`,
                        }}
                        indicatorColor={COLORS[index % COLORS.length]}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {(
                            (item.value / overviewData.totalCalls) *
                            100
                          ).toFixed(1)}
                          % of total calls
                        </span>
                        <span>
                          {item.name === "Interested" ? (
                            <span className="text-green-600">Conversion</span>
                          ) : item.name === "Call Back" ? (
                            <span className="text-blue-600">
                              Follow-up opportunity
                            </span>
                          ) : item.name === "Do Not Call" ? (
                            <span className="text-red-600">
                              Removed from future campaigns
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Disposition Trends</CardTitle>
              <CardDescription>
                How call outcomes have changed over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        date: "May 1",
                        Interested: 28,
                        "Not Interested": 42,
                        "Call Back": 24,
                        Voicemail: 56,
                        "Wrong Number": 12,
                        "Do Not Call": 8,
                      },
                      {
                        date: "May 2",
                        Interested: 32,
                        "Not Interested": 38,
                        "Call Back": 26,
                        Voicemail: 52,
                        "Wrong Number": 10,
                        "Do Not Call": 7,
                      },
                      {
                        date: "May 3",
                        Interested: 30,
                        "Not Interested": 45,
                        "Call Back": 28,
                        Voicemail: 58,
                        "Wrong Number": 11,
                        "Do Not Call": 9,
                      },
                      {
                        date: "May 4",
                        Interested: 34,
                        "Not Interested": 40,
                        "Call Back": 25,
                        Voicemail: 54,
                        "Wrong Number": 12,
                        "Do Not Call": 8,
                      },
                      {
                        date: "May 5",
                        Interested: 36,
                        "Not Interested": 43,
                        "Call Back": 27,
                        Voicemail: 60,
                        "Wrong Number": 11,
                        "Do Not Call": 8,
                      },
                      {
                        date: "May 6",
                        Interested: 31,
                        "Not Interested": 44,
                        "Call Back": 29,
                        Voicemail: 62,
                        "Wrong Number": 10,
                        "Do Not Call": 9,
                      },
                      {
                        date: "May 7",
                        Interested: 33,
                        "Not Interested": 46,
                        "Call Back": 28,
                        Voicemail: 56,
                        "Wrong Number": 12,
                        "Do Not Call": 8,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Interested" fill={COLORS[0]} stackId="a" />
                    <Bar
                      dataKey="Not Interested"
                      fill={COLORS[1]}
                      stackId="a"
                    />
                    <Bar dataKey="Call Back" fill={COLORS[2]} stackId="a" />
                    <Bar dataKey="Voicemail" fill={COLORS[3]} stackId="a" />
                    <Bar dataKey="Wrong Number" fill={COLORS[4]} stackId="a" />
                    <Bar dataKey="Do Not Call" fill={COLORS[5]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agentPerformanceData.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Active in this campaign
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Calls Per Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    agentPerformanceData.reduce(
                      (acc, agent) => acc + agent.calls,
                      0,
                    ) / agentPerformanceData.length,
                  )}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  +12 from previous period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    agentPerformanceData.reduce(
                      (acc, agent) => acc + agent.conversionRate,
                      0,
                    ) / agentPerformanceData.length
                  ).toFixed(1)}
                  %
                </div>
                <div className="text-xs text-green-600 mt-1">
                  +1.8% from previous period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={agentPerformanceData[0].avatar || "/placeholder.svg"}
                      alt={agentPerformanceData[0].name}
                    />
                    <AvatarFallback>
                      {agentPerformanceData[0].name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">
                      {agentPerformanceData[0].name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {agentPerformanceData[0].conversionRate}% conversion
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>
                Detailed performance metrics by agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Connected</TableHead>
                    <TableHead className="text-right">Avg. Duration</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerformanceData.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={agent.avatar || "/placeholder.svg"}
                              alt={agent.name}
                            />
                            <AvatarFallback>
                              {agent.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{agent.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {agent.calls}
                      </TableCell>
                      <TableCell className="text-right">
                        {agent.connected}
                      </TableCell>
                      <TableCell className="text-right">
                        {agent.avgDuration}
                      </TableCell>
                      <TableCell className="text-right">
                        {agent.conversions}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            agent.conversionRate >= 20
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : agent.conversionRate >= 15
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                          }
                        >
                          {agent.conversionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Calls by Agent</CardTitle>
                <CardDescription>
                  Total calls made by each agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={agentPerformanceData.map((agent) => ({
                        name: agent.name.split(" ")[0],
                        calls: agent.calls,
                        connected: agent.connected,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="calls" fill="#8884d8" name="Total Calls" />
                      <Bar
                        dataKey="connected"
                        fill="#82ca9d"
                        name="Connected Calls"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate by Agent</CardTitle>
                <CardDescription>
                  Percentage of calls resulting in conversions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={agentPerformanceData.map((agent) => ({
                        name: agent.name.split(" ")[0],
                        rate: agent.conversionRate,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="rate"
                        fill="#8884d8"
                        name="Conversion Rate (%)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Call Details</CardTitle>
                  <CardDescription>
                    Detailed log of all calls in this campaign
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      id: "call-1",
                      datetime: "2025-05-10 14:32",
                      contact: "John Smith",
                      phone: "(555) 123-4567",
                      agent: "Sarah Johnson",
                      duration: "4:12",
                      disposition: "Interested",
                      notes:
                        "Interested in learning more about investment opportunities. Scheduled follow-up call for next week.",
                    },
                    {
                      id: "call-2",
                      datetime: "2025-05-10 13:45",
                      contact: "Emily Davis",
                      phone: "(555) 234-5678",
                      agent: "Michael Chen",
                      duration: "2:38",
                      disposition: "Not Interested",
                      notes:
                        "Not interested at this time. Already working with another company.",
                    },
                    {
                      id: "call-3",
                      datetime: "2025-05-10 12:18",
                      contact: "Robert Wilson",
                      phone: "(555) 345-6789",
                      agent: "Emily Davis",
                      duration: "5:24",
                      disposition: "Call Back",
                      notes:
                        "Requested more information via email. Will call back after reviewing materials.",
                    },
                    {
                      id: "call-4",
                      datetime: "2025-05-10 11:05",
                      contact: "Jennifer Martinez",
                      phone: "(555) 456-7890",
                      agent: "David Wilson",
                      duration: "0:42",
                      disposition: "Voicemail",
                      notes: "Left voicemail with callback information.",
                    },
                    {
                      id: "call-5",
                      datetime: "2025-05-10 10:22",
                      contact: "Michael Brown",
                      phone: "(555) 567-8901",
                      agent: "Sarah Johnson",
                      duration: "3:15",
                      disposition: "Interested",
                      notes:
                        "Very interested in our services. Requested immediate follow-up with more details.",
                    },
                    {
                      id: "call-6",
                      datetime: "2025-05-10 09:48",
                      contact: "Lisa Johnson",
                      phone: "(555) 678-9012",
                      agent: "Michael Chen",
                      duration: "1:05",
                      disposition: "Wrong Number",
                      notes: "Wrong number. Removed from contact list.",
                    },
                    {
                      id: "call-7",
                      datetime: "2025-05-10 09:12",
                      contact: "David Thompson",
                      phone: "(555) 789-0123",
                      agent: "Emily Davis",
                      duration: "4:38",
                      disposition: "Call Back",
                      notes:
                        "Interested but busy. Requested callback tomorrow morning.",
                    },
                  ].map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>{call.datetime}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{call.contact}</div>
                          <div className="text-xs text-muted-foreground">
                            {call.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{call.agent}</TableCell>
                      <TableCell>{call.duration}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            call.disposition === "Interested"
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : call.disposition === "Call Back"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : call.disposition === "Not Interested"
                                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                  : call.disposition === "Voicemail"
                                    ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                    : "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
                          }
                        >
                          {call.disposition}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-[300px] truncate"
                        title={call.notes}
                      >
                        {call.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
