"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function InboxAnalytics() {
  const [timeRange, setTimeRange] = useState("7d");

  // Sample data - in a real app, this would be fetched from the backend
  const messageVolumeData = [
    { date: "Mon", email: 12, sms: 8, voice: 4 },
    { date: "Tue", email: 19, sms: 11, voice: 6 },
    { date: "Wed", email: 15, sms: 9, voice: 3 },
    { date: "Thu", email: 22, sms: 14, voice: 7 },
    { date: "Fri", email: 18, sms: 12, voice: 5 },
    { date: "Sat", email: 10, sms: 6, voice: 2 },
    { date: "Sun", email: 8, sms: 5, voice: 1 },
  ];

  const responseTimeData = [
    { date: "Mon", time: 45 },
    { date: "Tue", time: 32 },
    { date: "Wed", time: 38 },
    { date: "Thu", time: 27 },
    { date: "Fri", time: 35 },
    { date: "Sat", time: 52 },
    { date: "Sun", time: 60 },
  ];

  const messageStatusData = [
    { name: "New", value: 25, color: "#3b82f6" },
    { name: "Read", value: 15, color: "#6b7280" },
    { name: "Replied", value: 35, color: "#10b981" },
    { name: "Unsubscribed", value: 5, color: "#ef4444" },
    { name: "Flagged", value: 10, color: "#f59e0b" },
    { name: "Archived", value: 10, color: "#8b5cf6" },
  ];

  const campaignPerformanceData = [
    { name: "Q2 Tech Outreach", messages: 120, responses: 45, rate: 37.5 },
    {
      name: "Healthcare Professionals",
      messages: 85,
      responses: 38,
      rate: 44.7,
    },
    { name: "Financial Services", messages: 65, responses: 22, rate: 33.8 },
    { name: "Retail Stores NYC", messages: 95, responses: 41, rate: 43.2 },
    { name: "Education Institutions", messages: 75, responses: 28, rate: 37.3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Messaging Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">↑ 12%</span> from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42.3%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">↑ 5.2%</span> from previous
              period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38 min</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500">↓ 8 min</span> from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Unsubscribe Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.1%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">↓ 0.5%</span> from previous
              period
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="volume">
        <TabsList>
          <TabsTrigger value="volume">Message Volume</TabsTrigger>
          <TabsTrigger value="response">Response Time</TabsTrigger>
          <TabsTrigger value="status">Message Status</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Volume by Type</CardTitle>
              <CardDescription>
                Number of messages sent and received by type over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={messageVolumeData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="email"
                    name="Email"
                    stackId="a"
                    fill="#3b82f6"
                  />
                  <Bar dataKey="sms" name="SMS" stackId="a" fill="#10b981" />
                  <Bar
                    dataKey="voice"
                    name="Voice"
                    stackId="a"
                    fill="#8b5cf6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Average Response Time</CardTitle>
              <CardDescription>
                Average time to respond to messages (in minutes)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={responseTimeData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="time"
                    name="Response Time (min)"
                    stroke="#3b82f6"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Status Distribution</CardTitle>
              <CardDescription>
                Distribution of messages by current status
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={messageStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {messageStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Message volume and response rates by campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={campaignPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="messages" name="Messages Sent" fill="#3b82f6" />
                  <Bar
                    dataKey="responses"
                    name="Responses Received"
                    fill="#10b981"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
