"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";

export default function SignalHouseIntegrationPage() {
  const [isConnected, setIsConnected] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    // Simulate API test
    setTimeout(() => {
      setIsTesting(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SignalHouse.io Integration</h1>
          <p className="text-muted-foreground">
            Configure SignalHouse.io for high-deliverability SMS messaging
          </p>
        </div>
        {isConnected ? (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Not Connected
          </Badge>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sms">SMS Settings</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Tracking</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your SignalHouse.io API credentials. Get your API key from your SignalHouse dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">SignalHouse API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your SignalHouse API key"
                  defaultValue="••••••••••••••••"
                />
                <p className="text-sm text-muted-foreground">
                  Environment variable: SIGNALHOUSE_API_KEY
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-url">API URL</Label>
                <Input
                  id="api-url"
                  type="text"
                  placeholder="https://api.signalhouse.io"
                  defaultValue="https://api.signalhouse.io"
                />
                <p className="text-sm text-muted-foreground">
                  Environment variable: SIGNALHOUSE_API_URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-id">Default Sender ID</Label>
                <Input
                  id="sender-id"
                  type="text"
                  placeholder="Your Company Name or Phone Number"
                />
                <p className="text-sm text-muted-foreground">
                  This will be used as the default sender for SMS messages
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleTestConnection} disabled={isTesting}>
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
                <Button variant="outline">Save Credentials</Button>
              </div>

              {isConnected && (
                <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-950 dark:text-green-200">
                  <div className="flex items-center">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    <span className="text-sm font-medium">
                      Successfully connected to SignalHouse.io
                    </span>
                  </div>
                  <p className="mt-1 text-sm">Last connected: Just now</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Configuration</CardTitle>
              <CardDescription>
                Configure default settings for SMS messages sent through SignalHouse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max-length">Maximum Message Length</Label>
                <Input
                  id="max-length"
                  type="number"
                  placeholder="160"
                  defaultValue="160"
                />
                <p className="text-sm text-muted-foreground">
                  Messages longer than this will be split into multiple SMS
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-unicode"
                  className="h-4 w-4 rounded border-gray-300"
                  defaultChecked
                />
                <Label htmlFor="enable-unicode" className="font-normal">
                  Enable Unicode characters (emojis, special characters)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-retry"
                  className="h-4 w-4 rounded border-gray-300"
                  defaultChecked
                />
                <Label htmlFor="auto-retry" className="font-normal">
                  Automatically retry failed messages
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMS Delivery Settings</CardTitle>
              <CardDescription>
                Configure how SMS messages are sent and delivered
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-receipt">Delivery Receipt URL</Label>
                <Input
                  id="delivery-receipt"
                  type="text"
                  placeholder="https://your-domain.com/webhooks/signalhouse/delivery"
                  defaultValue="https://monkfish-app-mb7h3.ondigitalocean.app/webhooks/signalhouse/delivery"
                />
                <p className="text-sm text-muted-foreground">
                  Webhook URL for delivery status updates
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply-webhook">Reply Webhook URL</Label>
                <Input
                  id="reply-webhook"
                  type="text"
                  placeholder="https://your-domain.com/webhooks/signalhouse/reply"
                  defaultValue="https://monkfish-app-mb7h3.ondigitalocean.app/webhooks/signalhouse/reply"
                />
                <p className="text-sm text-muted-foreground">
                  Webhook URL for incoming SMS replies
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="track-clicks"
                  className="h-4 w-4 rounded border-gray-300"
                  defaultChecked
                />
                <Label htmlFor="track-clicks" className="font-normal">
                  Track link clicks in SMS messages
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shorten-urls"
                  className="h-4 w-4 rounded border-gray-300"
                  defaultChecked
                />
                <Label htmlFor="shorten-urls" className="font-normal">
                  Automatically shorten URLs in messages
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>
                Control the rate at which SMS messages are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="messages-per-second">Messages per Second</Label>
                <Input
                  id="messages-per-second"
                  type="number"
                  placeholder="10"
                  defaultValue="10"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of messages to send per second
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="daily-limit">Daily Message Limit</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  placeholder="10000"
                  defaultValue="10000"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum messages per day (0 for unlimited)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Tracking</CardTitle>
              <CardDescription>
                Track SMS campaigns and analyze performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Analytics</Label>
                <div className="rounded-lg border p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">12,453</p>
                      <p className="text-sm text-muted-foreground">Total Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">98.2%</p>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">23.5%</p>
                      <p className="text-sm text-muted-foreground">Response Rate</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-tracking"
                  className="h-4 w-4 rounded border-gray-300"
                  defaultChecked
                />
                <Label htmlFor="enable-tracking" className="font-normal">
                  Enable campaign performance tracking
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-tag"
                  className="h-4 w-4 rounded border-gray-300"
                  defaultChecked
                />
                <Label htmlFor="auto-tag" className="font-normal">
                  Automatically tag messages with campaign ID
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>
                Monitor recent SMS messages sent through SignalHouse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { to: "+1 555 0123", status: "Delivered", time: "2 minutes ago" },
                  { to: "+1 555 0456", status: "Delivered", time: "5 minutes ago" },
                  { to: "+1 555 0789", status: "Sent", time: "8 minutes ago" },
                  { to: "+1 555 0321", status: "Failed", time: "12 minutes ago" },
                ].map((msg, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{msg.to}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          msg.status === "Delivered"
                            ? "default"
                            : msg.status === "Failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {msg.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                SignalHouse.io service status and health metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>API Status</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average Response Time</span>
                  <span className="font-medium">142ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Success Rate (24h)</span>
                  <span className="font-medium">99.8%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Messages Remaining Today</span>
                  <span className="font-medium">8,547 / 10,000</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
