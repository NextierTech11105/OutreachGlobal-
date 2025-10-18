"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

interface MessagingAnalyticsProps {
  campaignId: string;
}

export function CampaignMessagingAnalytics({
  campaignId,
}: MessagingAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState({
    email: {
      sent: 245,
      delivered: 230,
      opened: 156,
      clicked: 68,
      replied: 23,
      bounced: 15,
      unsubscribed: 7,
    },
    sms: {
      sent: 180,
      delivered: 175,
      responded: 42,
      optedOut: 5,
    },
    voice: {
      attempted: 120,
      connected: 85,
      voicemail: 25,
      interested: 18,
      notInterested: 32,
      callback: 10,
      failed: 10,
    },
    byDay: [
      { day: "Mon", email: 45, sms: 32, voice: 18 },
      { day: "Tue", email: 52, sms: 38, voice: 24 },
      { day: "Wed", email: 49, sms: 36, voice: 22 },
      { day: "Thu", email: 55, sms: 42, voice: 28 },
      { day: "Fri", email: 44, sms: 32, voice: 28 },
    ],
    responseRates: [
      { name: "Email", value: 9.4 },
      { name: "SMS", value: 23.3 },
      { name: "Voice", value: 21.2 },
    ],
  });

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

  useEffect(() => {
    // Fetch analytics data for the campaign
    // This would be an API call in a real implementation
    console.log("Fetching analytics for campaign:", campaignId);
  }, [campaignId]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="voice">
            <Phone className="h-4 w-4 mr-2" />
            Voice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Response Rate by Channel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.responseRates}
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
                        {analyticsData.responseRates.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Messages by Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.byDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="email" fill="#0088FE" name="Email" />
                      <Bar dataKey="sms" fill="#00C49F" name="SMS" />
                      <Bar dataKey="voice" fill="#FFBB28" name="Voice" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Channel Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-blue-500" />
                        <span>Email</span>
                      </div>
                      <span className="text-sm">
                        {analyticsData.email.sent}
                      </span>
                    </div>
                    <Progress
                      value={
                        (analyticsData.email.sent /
                          (analyticsData.email.sent +
                            analyticsData.sms.sent +
                            analyticsData.voice.attempted)) *
                        100
                      }
                      className="h-2 bg-blue-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                        <span>SMS</span>
                      </div>
                      <span className="text-sm">{analyticsData.sms.sent}</span>
                    </div>
                    <Progress
                      value={
                        (analyticsData.sms.sent /
                          (analyticsData.email.sent +
                            analyticsData.sms.sent +
                            analyticsData.voice.attempted)) *
                        100
                      }
                      className="h-2 bg-green-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-yellow-500" />
                        <span>Voice</span>
                      </div>
                      <span className="text-sm">
                        {analyticsData.voice.attempted}
                      </span>
                    </div>
                    <Progress
                      value={
                        (analyticsData.voice.attempted /
                          (analyticsData.email.sent +
                            analyticsData.sms.sent +
                            analyticsData.voice.attempted)) *
                        100
                      }
                      className="h-2 bg-yellow-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.email.sent}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Opened</CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.email.opened /
                      analyticsData.email.delivered) *
                    100
                  ).toFixed(1)}
                  % open rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.email.opened}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clicked</CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.email.clicked / analyticsData.email.opened) *
                    100
                  ).toFixed(1)}
                  % click rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.email.clicked}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Replied</CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.email.replied /
                      analyticsData.email.delivered) *
                    100
                  ).toFixed(1)}
                  % reply rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.email.replied}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Delivered</span>
                    <span>
                      {(
                        (analyticsData.email.delivered /
                          analyticsData.email.sent) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analyticsData.email.delivered /
                        analyticsData.email.sent) *
                      100
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Opened</span>
                    <span>
                      {(
                        (analyticsData.email.opened /
                          analyticsData.email.delivered) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analyticsData.email.opened /
                        analyticsData.email.delivered) *
                      100
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Clicked</span>
                    <span>
                      {(
                        (analyticsData.email.clicked /
                          analyticsData.email.opened) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analyticsData.email.clicked /
                        analyticsData.email.opened) *
                      100
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Replied</span>
                    <span>
                      {(
                        (analyticsData.email.replied /
                          analyticsData.email.clicked) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analyticsData.email.replied /
                        analyticsData.email.clicked) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.sms.sent}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.sms.delivered / analyticsData.sms.sent) *
                    100
                  ).toFixed(1)}
                  % delivery rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.sms.delivered}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Responded</CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.sms.responded /
                      analyticsData.sms.delivered) *
                    100
                  ).toFixed(1)}
                  % response rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.sms.responded}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SMS Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Delivered</span>
                    <span>
                      {(
                        (analyticsData.sms.delivered / analyticsData.sms.sent) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analyticsData.sms.delivered / analyticsData.sms.sent) *
                      100
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Response Rate</span>
                    <span>
                      {(
                        (analyticsData.sms.responded /
                          analyticsData.sms.delivered) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analyticsData.sms.responded /
                        analyticsData.sms.delivered) *
                      100
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Opt-out Rate</span>
                    <span>
                      {(
                        (analyticsData.sms.optedOut /
                          analyticsData.sms.delivered) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (analyticsData.sms.optedOut /
                        analyticsData.sms.delivered) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Attempted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.voice.attempted}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Connected</CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.voice.connected /
                      analyticsData.voice.attempted) *
                    100
                  ).toFixed(1)}
                  % connection rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.voice.connected}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Interested
                </CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.voice.interested /
                      analyticsData.voice.connected) *
                    100
                  ).toFixed(1)}
                  % interest rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.voice.interested}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Voicemail</CardTitle>
                <CardDescription>
                  {(
                    (analyticsData.voice.voicemail /
                      analyticsData.voice.attempted) *
                    100
                  ).toFixed(1)}
                  % voicemail rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.voice.voicemail}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Interested",
                          value: analyticsData.voice.interested,
                        },
                        {
                          name: "Not Interested",
                          value: analyticsData.voice.notInterested,
                        },
                        {
                          name: "Callback",
                          value: analyticsData.voice.callback,
                        },
                        {
                          name: "Voicemail",
                          value: analyticsData.voice.voicemail,
                        },
                        { name: "Failed", value: analyticsData.voice.failed },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#4CAF50" />
                      <Cell fill="#F44336" />
                      <Cell fill="#2196F3" />
                      <Cell fill="#FFC107" />
                      <Cell fill="#9E9E9E" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
