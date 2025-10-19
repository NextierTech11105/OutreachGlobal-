"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function LlmUsageMonitor() {
  const [timeRange, setTimeRange] = useState("7d");

  // Mock data for usage charts
  const usageByDay = [
    { name: "Mon", tokens: 125000, cost: 2.5 },
    { name: "Tue", tokens: 180000, cost: 3.6 },
    { name: "Wed", tokens: 210000, cost: 4.2 },
    { name: "Thu", tokens: 190000, cost: 3.8 },
    { name: "Fri", tokens: 230000, cost: 4.6 },
    { name: "Sat", tokens: 120000, cost: 2.4 },
    { name: "Sun", tokens: 90000, cost: 1.8 },
  ];

  const usageByModel = [
    { name: "GPT-4o", value: 45 },
    { name: "Claude 3 Opus", value: 25 },
    { name: "Gemini 1.5 Pro", value: 15 },
    { name: "GPT-3.5 Turbo", value: 10 },
    { name: "Other", value: 5 },
  ];

  const usageByFeature = [
    { name: "Campaign Messages", value: 40 },
    { name: "Email Templates", value: 25 },
    { name: "Voice Scripts", value: 15 },
    { name: "SMS Templates", value: 12 },
    { name: "Other", value: 8 },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Usage Analytics</CardTitle>
            <CardDescription>
              Monitor your AI usage and costs across the platform
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="usage">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage">Token Usage</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-4">
            <div className="rounded-md border p-4">
              <h3 className="text-lg font-medium mb-4">
                Token Usage Over Time
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        `${value.toLocaleString()} tokens`,
                        "Usage",
                      ]}
                    />
                    <Bar dataKey="tokens" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,145,000</div>
                  <p className="text-xs text-muted-foreground">
                    +12.5% from last period
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Daily Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">163,571</div>
                  <p className="text-xs text-muted-foreground">
                    tokens per day
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Projected Monthly
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4,907,143</div>
                  <p className="text-xs text-muted-foreground">
                    tokens at current rate
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <div className="rounded-md border p-4">
              <h3 className="text-lg font-medium mb-4">Cost Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cost"]}
                    />
                    <Bar dataKey="cost" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$22.90</div>
                  <p className="text-xs text-muted-foreground">
                    +8.3% from last period
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Daily Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$3.27</div>
                  <p className="text-xs text-muted-foreground">per day</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Projected Monthly
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$98.14</div>
                  <p className="text-xs text-muted-foreground">
                    at current rate
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border p-4">
                <h3 className="text-lg font-medium mb-4">Usage by Model</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usageByModel}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {usageByModel.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Usage"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-md border p-4">
                <h3 className="text-lg font-medium mb-4">Usage by Feature</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usageByFeature}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {usageByFeature.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Usage"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Top AI-Consuming Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usageByFeature.slice(0, 3).map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span>{feature.name}</span>
                      <span className="font-medium">{feature.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
