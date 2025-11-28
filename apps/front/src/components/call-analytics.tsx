"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export function CallAnalytics() {
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Call Analytics</CardTitle>
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
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="conversion">Conversion</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Calls
                  </div>
                  <div className="text-2xl font-bold">247</div>
                  <div className="text-xs text-green-600 mt-1">
                    +12% from previous period
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Connected Rate
                  </div>
                  <div className="text-2xl font-bold">68%</div>
                  <div className="text-xs text-green-600 mt-1">
                    +5% from previous period
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Avg. Call Duration
                  </div>
                  <div className="text-2xl font-bold">4:32</div>
                  <div className="text-xs text-red-600 mt-1">
                    -0:18 from previous period
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Conversion Rate
                  </div>
                  <div className="text-2xl font-bold">22%</div>
                  <div className="text-xs text-green-600 mt-1">
                    +3% from previous period
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Call Volume Trend</h3>
              <div className="h-[300px] border rounded-md flex items-center justify-center bg-muted/20">
                <p className="text-muted-foreground">
                  Call volume chart will be displayed here
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-0 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Avg. Response Time
                    </div>
                    <div className="text-2xl font-bold">8.2s</div>
                    <div className="text-xs text-green-600 mt-1">
                      -1.3s from previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      First Call Resolution
                    </div>
                    <div className="text-2xl font-bold">72%</div>
                    <div className="text-xs text-green-600 mt-1">
                      +4% from previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Call Quality Score
                    </div>
                    <div className="text-2xl font-bold">8.7/10</div>
                    <div className="text-xs text-green-600 mt-1">
                      +0.3 from previous period
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">
                  Call Performance Metrics
                </h3>
                <div className="h-[300px] border rounded-md flex items-center justify-center bg-muted/20">
                  <p className="text-muted-foreground">
                    Call performance chart will be displayed here
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conversion" className="mt-0 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Lead Conversion
                    </div>
                    <div className="text-2xl font-bold">18%</div>
                    <div className="text-xs text-green-600 mt-1">
                      +2% from previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Meeting Set Rate
                    </div>
                    <div className="text-2xl font-bold">32%</div>
                    <div className="text-xs text-green-600 mt-1">
                      +5% from previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Cost Per Conversion
                    </div>
                    <div className="text-2xl font-bold">$42.18</div>
                    <div className="text-xs text-green-600 mt-1">
                      -$3.45 from previous period
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Conversion Funnel</h3>
                <div className="h-[300px] border rounded-md flex items-center justify-center bg-muted/20">
                  <p className="text-muted-foreground">
                    Conversion funnel chart will be displayed here
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="mt-0 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Active Agents
                    </div>
                    <div className="text-2xl font-bold">8</div>
                    <div className="text-xs text-green-600 mt-1">
                      +2 from previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Avg. Calls Per Agent
                    </div>
                    <div className="text-2xl font-bold">31</div>
                    <div className="text-xs text-red-600 mt-1">
                      -3 from previous period
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Top Agent Conversion
                    </div>
                    <div className="text-2xl font-bold">34%</div>
                    <div className="text-xs text-green-600 mt-1">
                      +6% from previous period
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">
                  Agent Performance Comparison
                </h3>
                <div className="h-[300px] border rounded-md flex items-center justify-center bg-muted/20">
                  <p className="text-muted-foreground">
                    Agent performance chart will be displayed here
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
