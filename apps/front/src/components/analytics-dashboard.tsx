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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiUsageChart } from "@/components/api-usage-chart";
import { LeadMetricsChart } from "@/components/lead-metrics-chart";
import { CampaignPerformanceTable } from "@/components/campaign-performance-table";
import { RoiAnalysisChart } from "@/components/roi-analysis-chart";

export function AnalyticsDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">30-Day Rolling Measurement</h3>
        <Select defaultValue="30days">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-usage">API Usage</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Leads Verified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,543</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-500">+12%</span>
                  <span className="text-xs text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Leads Enriched
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,875</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-500">+5%</span>
                  <span className="text-xs text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Routed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">248</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-500">+18%</span>
                  <span className="text-xs text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18.2%</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-500">+2.4%</span>
                  <span className="text-xs text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Lead Metrics</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <LeadMetricsChart />
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <CampaignPerformanceTable />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  AddressVerification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28,450</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    94.8% of monthly limit
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Compound Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">85</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    94.4% of monthly limit
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  PropertyDetail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">27,890</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    93.0% of monthly limit
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Polling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    93.3% of monthly limit
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Usage Trends</CardTitle>
              <CardDescription>
                Daily API call distribution over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ApiUsageChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  AI SDR Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    248 leads routed
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Human SDR Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    195 leads routed
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Nurture Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    189 leads routed
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Detailed performance metrics for all active campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignPerformanceTable detailed />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$1,245</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    Last 30 days
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Deals Closed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-500">+2</span>
                  <span className="text-xs text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$42,500</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-500">+$12,500</span>
                  <span className="text-xs text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3,414%</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-500">+412%</span>
                  <span className="text-xs text-muted-foreground">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis</CardTitle>
              <CardDescription>
                Cost vs. revenue breakdown by campaign type
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <RoiAnalysisChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
