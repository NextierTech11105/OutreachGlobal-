"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  Shield,
  Activity,
  Save,
  TestTube,
  RefreshCw,
} from "lucide-react";

export default function SignalHousePage() {
  const [apiKey, setApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const testConnection = async () => {
    setIsTestingConnection(true);
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTestingConnection(false);
    setIsConnected(true);
  };

  const stats = {
    messagesThisMonth: 12453,
    deliveryRate: 98.7,
    avgResponseTime: 2.3,
    phoneVerifications: 3421,
  };

  const recentActivity = [
    { id: 1, type: "SMS", phone: "+1 (555) 123-4567", status: "delivered", time: "2 min ago" },
    { id: 2, type: "Verify", phone: "+1 (555) 987-6543", status: "valid", time: "5 min ago" },
    { id: 3, type: "SMS", phone: "+1 (555) 456-7890", status: "delivered", time: "8 min ago" },
    { id: 4, type: "Verify", phone: "+1 (555) 321-0987", status: "invalid", time: "12 min ago" },
    { id: 5, type: "SMS", phone: "+1 (555) 654-3210", status: "failed", time: "15 min ago" },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SignalHouse SMS
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure SignalHouse SMS and phone verification integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              Disconnected
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">Industry avg: 95%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}s</div>
            <p className="text-xs text-muted-foreground">Message delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Phone Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.phoneVerifications.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Enter your SignalHouse API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sh_live_xxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                Find your API key in the SignalHouse dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL (for incoming messages)</Label>
              <Input
                readOnly
                value="https://api.outreach.app/webhooks/signalhouse"
              />
              <p className="text-xs text-muted-foreground">
                Configure this URL in your SignalHouse settings
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={testConnection} disabled={isTestingConnection}>
                {isTestingConnection ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>
              Enable/disable SignalHouse features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Messaging</Label>
                <p className="text-xs text-muted-foreground">Send SMS to leads</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Phone Verification</Label>
                <p className="text-xs text-muted-foreground">Verify phone numbers before sending</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-DNC Check</Label>
                <p className="text-xs text-muted-foreground">Check DNC list before sending</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Delivery Receipts</Label>
                <p className="text-xs text-muted-foreground">Track message delivery status</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Way Messaging</Label>
                <p className="text-xs text-muted-foreground">Receive and process replies</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest SignalHouse API activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.type === "SMS" ? (
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-purple-500" />
                      )}
                      {item.type}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{item.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        item.status === "delivered" || item.status === "valid"
                          ? "bg-green-500/10 text-green-500"
                          : item.status === "invalid" || item.status === "failed"
                          ? "bg-red-500/10 text-red-500"
                          : ""
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.time}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
